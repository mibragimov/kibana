/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getDisplayValueFromFilter, getFieldDisplayValueFromFilter } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import { EuiTextColor, useEuiPaddingCSS, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { FilterBadgeGroup } from './filter_badge_group';
import { FilterContent } from './filter_content';
import { getBooleanRelationType } from '../utils';
import { FilterBadgeInvalidPlaceholder } from './filter_badge_invalid';

export interface FilterBadgeExpressionProps {
  filter: Filter;
  shouldShowBrackets?: boolean;
  dataViews: DataView[];
  filterLabelStatus?: string;
}

interface FilterBadgeContentProps {
  filter: Filter;
  dataViews: DataView[];
  filterLabelStatus?: string;
}

const FilterBadgeContent = ({ filter, dataViews, filterLabelStatus }: FilterBadgeContentProps) => {
  const valueLabel = filterLabelStatus
    ? filterLabelStatus
    : getDisplayValueFromFilter(filter, dataViews);
  const fieldLabel = getFieldDisplayValueFromFilter(filter, dataViews);

  if (!(valueLabel && filter)) {
    return <FilterBadgeInvalidPlaceholder />;
  }

  return <FilterContent filter={filter} valueLabel={valueLabel} fieldLabel={fieldLabel} />;
};

export function FilterExpressionBadge({
  filter,
  shouldShowBrackets,
  dataViews,
  filterLabelStatus,
}: FilterBadgeExpressionProps) {
  const conditionalOperationType = getBooleanRelationType(filter);
  const paddingLeft = useEuiPaddingCSS('left').xs;
  const paddingRight = useEuiPaddingCSS('right').xs;

  const { euiTheme } = useEuiTheme();

  const bracketColor = useMemo(
    () => css`
      color: ${euiTheme.colors.primary};
    `,
    [euiTheme.colors.primary]
  );

  return conditionalOperationType ? (
    <>
      {shouldShowBrackets ? (
        <span css={paddingLeft}>
          <EuiTextColor className={bracketColor}>(</EuiTextColor>
        </span>
      ) : null}
      <FilterBadgeGroup
        filters={filter.meta?.params}
        dataViews={dataViews}
        filterLabelStatus={filterLabelStatus}
        booleanRelation={getBooleanRelationType(filter)}
      />
      {shouldShowBrackets ? (
        <span css={paddingRight}>
          <EuiTextColor className={bracketColor}>)</EuiTextColor>
        </span>
      ) : null}
    </>
  ) : (
    <span css={[paddingLeft, paddingRight]}>
      <FilterBadgeContent
        filter={filter}
        dataViews={dataViews}
        filterLabelStatus={filterLabelStatus}
      />
    </span>
  );
}
