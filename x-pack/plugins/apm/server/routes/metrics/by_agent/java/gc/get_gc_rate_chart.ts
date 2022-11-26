/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as theme } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { METRIC_JAVA_GC_COUNT } from '../../../../../../common/es_fields/apm';
import { fetchAndTransformGcMetrics } from './fetch_and_transform_gc_metrics';
import { ChartBase } from '../../../types';
import { APMConfig } from '../../../../..';
import { APMEventClient } from '../../../../../lib/helpers/create_es_client/create_apm_event_client';

const series = {
  [METRIC_JAVA_GC_COUNT]: {
    title: i18n.translate('xpack.apm.agentMetrics.java.gcRate', {
      defaultMessage: 'GC rate',
    }),
    color: theme.euiColorVis0,
  },
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.java.gcRateChartTitle', {
    defaultMessage: 'Garbage collection per minute',
  }),
  key: 'gc_rate_line_chart',
  type: 'linemark',
  yUnit: 'integer',
  series,
};

function getGcRateChart({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  serviceNodeName,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName: string;
  serviceNodeName?: string;
  start: number;
  end: number;
}) {
  return fetchAndTransformGcMetrics({
    environment,
    kuery,
    config,
    apmEventClient,
    serviceName,
    serviceNodeName,
    start,
    end,
    chartBase,
    fieldName: METRIC_JAVA_GC_COUNT,
    operationName: 'get_gc_rate_charts',
  });
}

export { getGcRateChart };
