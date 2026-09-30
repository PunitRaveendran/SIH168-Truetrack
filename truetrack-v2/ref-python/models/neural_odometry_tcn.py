"""
Calibrated Heteroscedastic Neural Odometry Model (TCN).
Operates on gravity-aligned vehicle-frame IMU data in physical units (m/s^2, rad/s).
Outputs:
- Mean forward speed mu_v (m/s)
- Mean lateral velocity mu_lat (m/s, for NHC slip gating)
- Predicted log-variance log(sigma_v^2) for EKF adaptive measurement weighting
Trained via Gaussian Negative Log-Likelihood (NLL).
"""

import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


class CausalConvBlock1D(nn.Module):
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 3, dilation: int = 1):
        super().__init__()
        self.padding = (kernel_size - 1) * dilation
        self.conv = nn.Conv1d(
            in_channels,
            out_channels,
            kernel_size=kernel_size,
            dilation=dilation,
            padding=self.padding
        )
        self.bn = nn.BatchNorm1d(out_channels)
        self.act = nn.LeakyReLU(0.1)

        # Residual projection if channel dimensions differ
        self.res_conv = nn.Conv1d(in_channels, out_channels, kernel_size=1) if in_channels != out_channels else None

    def forward(self, x):
        # Causal slicing: remove future padding
        conv_out = self.conv(x)
        if self.padding > 0:
            conv_out = conv_out[:, :, :-self.padding]
        conv_out = self.bn(conv_out)
        conv_out = self.act(conv_out)

        res = x if self.res_conv is None else self.res_conv(x)
        return conv_out + res


class HeteroscedasticOdometryTCN(nn.Module):
    def __init__(self, in_channels: int = 6, window_size: int = 50):
        super().__init__()
        self.window_size = window_size

        # Temporal Convolutional Network Backbone (Dilated Causal)
        self.layer1 = CausalConvBlock1D(in_channels, 32, kernel_size=3, dilation=1)
        self.layer2 = CausalConvBlock1D(32, 64, kernel_size=3, dilation=2)
        self.layer3 = CausalConvBlock1D(64, 64, kernel_size=3, dilation=4)

        self.pool = nn.AdaptiveAvgPool1d(1)
        self.fc_shared = nn.Sequential(
            nn.Linear(64, 32),
            nn.LeakyReLU(0.1)
        )

        # Head 1: Forward speed mean (m/s, non-negative via softplus)
        self.head_fwd_speed = nn.Linear(32, 1)

        # Head 2: Lateral velocity mean (m/s, signed)
        self.head_lat_speed = nn.Linear(32, 1)

        # Head 3: Forward speed log-variance log(sigma^2)
        self.head_log_var = nn.Linear(32, 1)

    def forward(self, x):
        """
        Input: [Batch, 6, 50] - [ax, ay, az, gx, gy, gz] in vehicle frame
        Returns:
            mu_v: [Batch, 1] forward speed
            mu_lat: [Batch, 1] lateral speed
            log_var_v: [Batch, 1] log-variance of forward speed
        """
        feat = self.layer1(x)
        feat = self.layer2(feat)
        feat = self.layer3(feat)
        feat = self.pool(feat).squeeze(-1)
        shared = self.fc_shared(feat)

        mu_v = F.softplus(self.head_fwd_speed(shared))
        mu_lat = self.head_lat_speed(shared)
        log_var_v = torch.clamp(self.head_log_var(shared), min=-6.0, max=4.0)

        return mu_v, mu_lat, log_var_v

    def get_parameter_count(self) -> int:
        return sum(p.numel() for p in self.parameters())


def gaussian_nll_loss(mu_v, log_var_v, target_v, mu_lat = None, lambda_lat: float = 0.1):
    """
    Gaussian Negative Log-Likelihood Loss with optional lateral velocity regularization:
    Loss = 0.5 * exp(-log_var) * (target - mu)^2 + 0.5 * log_var + lambda * mu_lat^2
    """
    var_v = torch.exp(log_var_v)
    sq_err = (target_v - mu_v) ** 2
    nll = 0.5 * (sq_err / (var_v + 1e-6) + log_var_v)

    total_loss = nll.mean()
    if mu_lat is not None:
        total_loss += lambda_lat * (mu_lat ** 2).mean()

    return total_loss
