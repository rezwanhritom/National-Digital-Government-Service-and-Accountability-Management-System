import systemMonitorService from '../services/systemMonitorService.js';
import alertService from '../services/alertService.js';
import AlertRule from '../models/AlertRule.js';
import AlertLog from '../models/AlertLog.js';
import SystemPolicy from '../models/SystemPolicy.js';
import { logAudit } from '../services/auditService.js';

export const getSystemHealth = async (req, res, next) => {
  try {
    const health = await systemMonitorService.getSystemHealth();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentMetrics = async (req, res, next) => {
  try {
    const metrics = await systemMonitorService.getCurrentMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
};

export const getMetricsHistory = async (req, res, next) => {
  try {
    const { hours = 24 } = req.query;
    const history = await systemMonitorService.getMetricsHistory(parseInt(hours));
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

export const getAlertRules = async (req, res, next) => {
  try {
    const rules = await AlertRule.find({})
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    next(error);
  }
};

export const createAlertRule = async (req, res, next) => {
  try {
    const rule = new AlertRule(req.body);
    await rule.save();

    res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    next(error);
  }
};

export const updateAlertRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const rule = await AlertRule.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Alert rule not found'
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAlertRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await AlertRule.findByIdAndDelete(id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Alert rule not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert rule deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveAlerts = async (req, res, next) => {
  try {
    const alerts = await alertService.getActiveAlerts();
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};

export const getAlertHistory = async (req, res, next) => {
  try {
    const { limit = 100, severity } = req.query;
    const query = {};
    if (severity) query.severity = severity;

    const alerts = await AlertLog.find(query)
      .populate('ruleId', 'name metric')
      .sort({ triggeredAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
};

export const acknowledgeAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    await alertService.acknowledgeAlert(id, userId);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardOverview = async (req, res, next) => {
  try {
    const [
      health,
      currentMetrics,
      activeAlerts,
      recentAlerts
    ] = await Promise.all([
      systemMonitorService.getSystemHealth(),
      systemMonitorService.getCurrentMetrics(),
      alertService.getActiveAlerts(),
      AlertLog.find()
        .populate('ruleId', 'name metric severity')
        .sort({ triggeredAt: -1 })
        .limit(10)
    ]);

    res.json({
      success: true,
      data: {
        systemHealth: health,
        currentMetrics,
        activeAlertsCount: activeAlerts.length,
        activeAlerts,
        recentAlerts
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemPolicy = async (req, res, next) => {
  try {
    let policy = await SystemPolicy.findOne().sort({ createdAt: -1 });
    if (!policy) {
      policy = await SystemPolicy.create({});
    }
    return res.json({ success: true, data: policy });
  } catch (error) {
    return next(error);
  }
};

export const upsertSystemPolicy = async (req, res, next) => {
  try {
    const current = await SystemPolicy.findOne().sort({ createdAt: -1 });
    const policy = current
      ? await SystemPolicy.findByIdAndUpdate(current._id, req.body ?? {}, { new: true, runValidators: true })
      : await SystemPolicy.create(req.body ?? {});
    await logAudit('system.policy_update', req, {
      resourceType: 'SystemPolicy',
      resourceId: String(policy._id),
      meta: { retentionDays: policy.retentionDays, backupEnabled: policy.backupEnabled },
    });
    return res.json({ success: true, data: policy });
  } catch (error) {
    return next(error);
  }
};
