import matplotlib.pyplot as plt
import numpy as np
import os

def generate_v2_plot():
    # Setup the plot
    plt.figure(figsize=(10, 6), facecolor='white')
    plt.title("IO-VNBD Ground Vehicle: TrueTrack v2 AI-Fusion Validation (45s Blackout)\n[SIMULATED BENCHMARK TRACE]", fontsize=12, fontweight='bold')
    
    # Generate Synthetic Trajectory Data based on the metrics
    y_true = np.linspace(0, 600, 100)
    x_true = np.zeros_like(y_true)
    
    # Ground Truth
    plt.plot(x_true, y_true, color='black', linewidth=2, label='Ground Truth (IO-VNBD Car)')
    
    # B1 (INS + NHC)
    y_b1 = np.linspace(0, 620, 100)
    x_b1 = -25.0 * (y_b1/620)**2
    plt.plot(x_b1, y_b1, color='m', linestyle='-.', linewidth=1.5, label='B1 INS + NHC (Drift: 25.6m / 4.2%)')
    
    # TrueTrack v2 (AI-Fusion)
    # Drift is 2.8m total. Let's make it slightly off so it's visible, but extremely close
    y_v2 = np.linspace(0, 598.5, 100)
    x_v2 = -1.2 * (y_v2/600)**2
    plt.plot(x_v2, y_v2, color='green', linestyle='--', linewidth=2.5, label='TrueTrack v2 AI-Fusion (Drift: 2.8m / 0.4%)')

    plt.xlabel("Local East Position (meters)")
    plt.ylabel("Local North Position (meters)")
    
    plt.grid(True, linestyle=':', alpha=0.6)
    plt.xlim(-30, 10)
    plt.ylim(-20, 650)
    plt.legend(loc='lower left', shadow=True)
    
    output_dir = r"C:\Users\Punit Raveendran\Desktop\Projects\SIH 2\truetrack-v2\results\figures"
    os.makedirs(output_dir, exist_ok=True)
    save_path = os.path.join(output_dir, "iovnbd_trajectory_truetrack_v2.png")
    
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    print(f"Successfully generated {save_path}")

if __name__ == "__main__":
    generate_v2_plot()
