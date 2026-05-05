import AlertRule from '../models/AlertRule.js';
import AlertLog from '../models/AlertLog.js';

class AlertService {
  constructor() {
    this.checkInterval = 60000;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.checkAlerts();
    this.interval = setInterval(() => this.checkAlerts(), this.checkInterval);
  }

  stop() {
    this.isRunning = false;
    if (this.interval) clearInterval(this.interval);
  }

  async checkAlerts() {
    try {
      const rules = await AlertRule.find({ enabled: true });
      for (const rule of rules) {
        await this.evaluateRule(rule);
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  async evaluateRule(rule) {
    try {
      const value = await this.getMetricValue(rule.metric);
      const isTriggered = this.checkCondition(value, rule.condition, rule.threshold);

      if (isTriggered) {
        await this.createAlert(rule, value);
        await AlertRule.findByIdAndUpdate(rule._id, { lastTriggeredAt: new Date() });
      }
    } catch (error) {
      console.error('Error evaluating rule:', error);
    }
  }

  async getMetricValue(metric) {
    switch (metric) {
      case 'api.latency.p95': return Math.random() * 1000;
      case 'api.error.rate': return Math.random() * 10;
      case 'system.cpu.usage': return Math.random() * 100;
      case 'system.memory.usage': return Math.random() * 100;
      case 'queue.depth.max': return Math.floor(Math.random() * 1000);
      case 'storage.usage': return Math.random() * 100;
      case 'fleet.on_time_percentage': return 85 + Math.random() * 15;
      default: return 0;
    }
  }

  checkCondition(value, condition, threshold) {
    switch (condition) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  async createAlert(rule, value) {
    const message = `${rule.name}: ${rule.metric} ${rule.condition} ${rule.threshold} (current: ${value})`;

    const alert = new AlertLog({
      ruleId: rule._id,
      value,
      message,
      severity: rule.severity,
      notificationChannels: rule.notificationChannels,
    });

    await alert.save();
    console.log(`ALERT: ${message}`);

    return alert;
  }

  async getActiveAlerts() {
    return await AlertLog.find({ acknowledgedAt: null, resolvedAt: null })
      .populate('ruleId')
      .sort({ triggeredAt: -1 });
  }

  async acknowledgeAlert(alertId, userId) {
    return await AlertLog.findByIdAndUpdate(alertId, {
      acknowledgedAt: new Date(),
      acknowledgedBy: userId,
    });
  }
}

export default new AlertService();