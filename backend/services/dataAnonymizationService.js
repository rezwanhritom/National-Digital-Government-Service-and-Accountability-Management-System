import crypto from 'crypto';

class DataAnonymizationService {
  constructor() {
    this.granularityLevels = {
      strict: 0.01,
      medium: 0.005,
      minimal: 0.001,
    };
  }

  anonymizeLocation(lat, lng, granularity = 'medium') {
    const precision = this.granularityLevels[granularity] || this.granularityLevels.medium;

    const roundedLat = Math.round(lat / precision) * precision;
    const roundedLng = Math.round(lng / precision) * precision;

    return {
      lat: parseFloat(roundedLat.toFixed(6)),
      lng: parseFloat(roundedLng.toFixed(6)),
      gridCell: `${roundedLat.toFixed(6)},${roundedLng.toFixed(6)}`,
      precision: granularity
    };
  }

  anonymizePhoneNumber(phone) {
    if (!phone) return null;

    const phoneStr = phone.toString();
    if (phoneStr.length <= 4) return phoneStr;

    return `***${phoneStr.slice(-4)}`;
  }

  anonymizePersonalId(id, salt = 'transit-data') {
    if (!id) return null;

    const hash = crypto.createHash('sha256');
    hash.update(`${salt}:${id}`);
    return hash.digest('hex').substring(0, 16);
  }

  anonymizeTimestamp(timestamp, granularity = 'hour') {
    if (!timestamp) return null;
    
    const date = new Date(timestamp);
    
    switch (granularity) {
      case 'hour':
        date.setMinutes(0, 0, 0);
        break;
      case 'day':
        date.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = date.getDay();
        date.setDate(date.getDate() - dayOfWeek);
        date.setHours(0, 0, 0, 0);
        break;
      case 'month':
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        break;
    }
    
    return date.toISOString();
  }

  anonymizeData(data, fieldsToAnonymize = [], options = {}) {
    const {
      locationGranularity = 'medium',
      timestampGranularity = 'hour',
      removeFields = [],
      hashFields = []
    } = options;

    const anonymized = { ...data };

    removeFields.forEach(field => {
      if (anonymized[field] !== undefined) {
        delete anonymized[field];
      }
    });

    fieldsToAnonymize.forEach(field => {
      if (anonymized[field] !== undefined) {
        switch (field) {
          case 'location':
          case 'coordinates':
            if (anonymized[field] && anonymized[field].lat !== undefined) {
              anonymized[field] = this.anonymizeLocation(
                anonymized[field].lat, 
                anonymized[field].lng, 
                locationGranularity
              );
            }
            break;
          case 'phone':
          case 'phoneNumber':
            anonymized[field] = this.anonymizePhoneNumber(anonymized[field]);
            break;
          case 'timestamp':
          case 'submittedAt':
          case 'createdAt':
            anonymized[field] = this.anonymizeTimestamp(anonymized[field], timestampGranularity);
            break;
        }
      }
    });

    hashFields.forEach(field => {
      if (anonymized[field] !== undefined) {
        anonymized[field] = this.anonymizePersonalId(anonymized[field]);
      }
    });

    return anonymized;
  }

  anonymizeDataset(dataset, config = {}) {
    return dataset.map(record => this.anonymizeData(record, [], config));
  }

  getPrivacyConfig(dataType) {
    const configs = {
      incidents: {
        removeFields: ['submittedBy', 'media'],
        fieldsToAnonymize: ['location'],
        hashFields: ['busId'],
        locationGranularity: 'medium',
        timestampGranularity: 'hour'
      },
      fleet: {
        removeFields: ['operatorId'],
        fieldsToAnonymize: ['timestamp'],
        hashFields: ['vehicleId', 'tripId'],
        timestampGranularity: 'hour'
      },
      congestion: {
        fieldsToAnonymize: ['location', 'timestamp'],
        locationGranularity: 'strict',
        timestampGranularity: 'hour'
      },
      metrics: {
        removeFields: ['userId', 'ipAddress'],
        fieldsToAnonymize: ['timestamp'],
        timestampGranularity: 'day'
      }
    };

    return configs[dataType] || {};
  }
}

export default new DataAnonymizationService();
