import { storage } from './storage';

export class StatusCheckService {
  private static instance: StatusCheckService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): StatusCheckService {
    if (!StatusCheckService.instance) {
      StatusCheckService.instance = new StatusCheckService();
    }
    return StatusCheckService.instance;
  }

  /**
   * Start the status check service
   * Performs initial check and sets up periodic checks
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Status check service is already running');
      return;
    }

    console.log('Starting Fi.V Connect status check service...');
    this.isRunning = true;

    try {
      // Perform startup check
      await this.performStartupCheck();
      
      // Set up periodic checks
      await this.schedulePeriodicChecks();
      
      console.log('Fi.V Connect status check service started successfully');
    } catch (error) {
      console.error('Failed to start status check service:', error);
      // Don't throw - allow the server to continue running even if status check fails
    }
  }

  /**
   * Stop the status check service
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Fi.V Connect status check service stopped');
  }

  /**
   * Perform a manual status check
   */
  public async performManualCheck(): Promise<any> {
    console.log('Performing manual status check...');
    try {
      const result = await storage.performStatusCheck('manual');
      console.log('Manual status check completed:', result);
      return result;
    } catch (error) {
      console.error('Manual status check failed:', error);
      throw error;
    }
  }

  /**
   * Perform startup status check
   */
  private async performStartupCheck(): Promise<void> {
    console.log('Performing startup status check...');
    
    try {
      const config = await storage.getInstanceConfig();
      
      if (!config) {
        console.log('No instance configuration found. Skipping startup status check.');
        console.log('Please configure the instance via /api/instance/config to enable status checks.');
        return;
      }

      const result = await storage.performStatusCheck('startup');
      console.log('Startup status check completed:', result);
      
      // Handle specific statuses
      if (result.status === 'suspended') {
        console.warn('⚠️  Instance is SUSPENDED. All user access will be blocked.');
      } else if (result.status === 'pending_payment') {
        console.warn('⚠️  Instance has PENDING PAYMENT. Users will see payment notification.');
      } else {
        console.log('✅ Instance status is ACTIVE');
      }
      
    } catch (error) {
      console.error('Startup status check failed:', error);
      // Log but don't throw - allow server to start even if status check fails
    }
  }

  /**
   * Set up periodic status checks
   */
  private async schedulePeriodicChecks(): Promise<void> {
    const config = await storage.getInstanceConfig();
    
    if (!config) {
      console.log('No instance configuration found. Periodic checks will be disabled.');
      return;
    }

    const intervalMinutes = config.checkIntervalMinutes || 60; // Default to 60 minutes
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`Scheduling periodic status checks every ${intervalMinutes} minutes`);

    this.intervalId = setInterval(async () => {
      try {
        console.log('Performing scheduled status check...');
        const result = await storage.performStatusCheck('scheduled');
        console.log('Scheduled status check completed:', result);
        
        // Log status changes
        if (result.status === 'suspended') {
          console.warn('⚠️  Instance status changed to SUSPENDED');
        } else if (result.status === 'pending_payment') {
          console.warn('⚠️  Instance status changed to PENDING PAYMENT');
        }
        
      } catch (error) {
        console.error('Scheduled status check failed:', error);
        // Continue running even if individual checks fail
      }
    }, intervalMs);
  }

  /**
   * Check if service is running
   */
  public isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get service status
   */
  public getServiceStatus(): any {
    return {
      isRunning: this.isRunning,
      hasInterval: this.intervalId !== null,
      nextCheckIn: this.intervalId ? 'Running' : 'Not scheduled'
    };
  }
}

// Export singleton instance
export const statusCheckService = StatusCheckService.getInstance();