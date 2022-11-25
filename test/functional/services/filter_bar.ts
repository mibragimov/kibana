/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import classNames from 'classnames';
import { FtrService } from '../ftr_provider_context';

export const Operation = {
  IS: 'is',
  IS_NOT: 'is not',
  IS_ONE_OF: 'is one of',
  IS_NOT_ONE_OF: 'is not one of',
  IS_BETWEEN: 'is between',
  IS_NOT_BETWEEN: 'is not between',
  EXISTS: 'exists',
  DOES_NOT_EXIST: 'does not exist',
} as const;

export const BooleanRelation = {
  AND: 'AND',
  OR: 'OR',
} as const;

type BooleanRelation = $Values<typeof BooleanRelation>;

interface BasicFilter {
  field: string;
}

interface FilterWithMultipleValues extends BasicFilter {
  operation: typeof Operation.IS_ONE_OF | typeof Operation.IS_NOT_ONE_OF;
  value: string[];
}

interface FilterWithRange extends BasicFilter {
  operation: typeof Operation.IS_BETWEEN | typeof Operation.IS_NOT_BETWEEN;
  value: { from: number | undefined; to: number | undefined };
}

interface FilterWithSingleValue extends BasicFilter {
  operation: typeof Operation.IS | typeof Operation.IS_NOT;
  value: string;
}

interface FilterWithoutValue extends BasicFilter {
  operation: typeof Operation.EXISTS | typeof Operation.DOES_NOT_EXIST;
}

type FilterLeaf =
  | FilterWithoutValue
  | FilterWithSingleValue
  | FilterWithMultipleValues
  | FilterWithRange;

interface FilterNode {
  condition: BooleanRelation;
  filters: Array<FilterLeaf | FilterNode>;
}

type Filter = FilterLeaf | FilterNode;

export class FilterBarService extends FtrService {
  private readonly comboBox = this.ctx.getService('comboBox');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly retry = this.ctx.getService('retry');
  private readonly config = this.ctx.getService('config');
  private readonly defaultTryTimeout = this.config.get('timeouts.try');
  private readonly browser = this.ctx.getService('browser');
  /**
   * Checks if specified filter exists
   *
   * @param key field name
   * @param value filter value
   * @param enabled filter status
   * @param pinned filter pinned status
   * @param negated filter including or excluding value
   */
  public async hasFilter(
    key: string,
    value: string,
    enabled: boolean = true,
    pinned: boolean = false,
    negated: boolean = false
  ): Promise<boolean> {
    const filterActivationState = enabled ? 'enabled' : 'disabled';
    const filterPinnedState = pinned ? 'pinned' : 'unpinned';
    const filterNegatedState = negated ? 'filter-negated' : '';
    return this.testSubjects.exists(
      classNames(
        'filter',
        `filter-${filterActivationState}`,
        key !== '' && `filter-key-${key}`,
        value !== '' && `filter-value-${value}`,
        `filter-${filterPinnedState}`,
        filterNegatedState
      ),
      {
        allowHidden: true,
      }
    );
  }

  /**
   * Removes specified filter
   *
   * @param key field name
   */
  public async removeFilter(key: string): Promise<void> {
    await this.retry.try(async () => {
      await this.testSubjects.click(`~filter & ~filter-key-${key}`);
      await this.testSubjects.click(`deleteFilter`);
    });
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  /**
   * Removes all filters
   */
  public async removeAllFilters(): Promise<void> {
    await this.testSubjects.click('showQueryBarMenu');
    await this.testSubjects.click('filter-sets-removeAllFilters');
    await this.header.waitUntilLoadingHasFinished();
    await this.common.waitUntilUrlIncludes('filters:!()');
  }

  /**
   * Changes filter active status
   *
   * @param key field name
   */
  public async toggleFilterEnabled(key: string): Promise<void> {
    await this.testSubjects.click(`~filter & ~filter-key-${key}`);
    await this.testSubjects.click(`disableFilter`);
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  public async toggleFilterPinned(key: string): Promise<void> {
    await this.testSubjects.click(`~filter & ~filter-key-${key}`);
    await this.testSubjects.click(`pinFilter`);
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  public async toggleFilterNegated(key: string): Promise<void> {
    await this.testSubjects.click(`~filter & ~filter-key-${key}`);
    await this.testSubjects.click(`negateFilter`);
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  public async isFilterPinned(key: string): Promise<boolean> {
    const filter = await this.testSubjects.find(`~filter & ~filter-key-${key}`);
    return (await filter.getAttribute('data-test-subj')).includes('filter-pinned');
  }

  public async getFilterCount(): Promise<number> {
    const filters = await this.testSubjects.findAll('~filter');
    return filters.length;
  }

  public async getFiltersLabel(): Promise<string[]> {
    const filters = await this.testSubjects.findAll('~filter');
    return Promise.all(filters.map((filter) => filter.getVisibleText()));
  }

  public async openFilterBuilder() {
    await this.retry.try(async () => {
      await this.testSubjects.click('addFilter');
      await this.testSubjects.existOrFail('addFilterPopover');
    });
  }

  public async addFilterAndSelectDataView(
    dataViewTitle: string | null,
    field: string,
    operator: string,
    ...values: any
  ): Promise<void> {
    await this.openFilterBuilder();

    await this.retry.tryForTime(this.defaultTryTimeout * 2, async () => {
      if (dataViewTitle) {
        await this.comboBox.set('filterIndexPatternsSelect', dataViewTitle);
      }

      await this.comboBox.set('filterFieldSuggestionList', field);
      await this.comboBox.set('filterOperatorList', operator);
      const params = await this.testSubjects.find('filterParams');
      const paramsComboBoxes = await params.findAllByCssSelector(
        '[data-test-subj~="filterParamsComboBox"]',
        1000
      );
      const paramFields = await params.findAllByTagName('input', 1000);
      for (let i = 0; i < values.length; i++) {
        let fieldValues = values[i];
        if (!Array.isArray(fieldValues)) {
          fieldValues = [fieldValues];
        }

        if (paramsComboBoxes && paramsComboBoxes.length > 0) {
          for (let j = 0; j < fieldValues.length; j++) {
            await this.comboBox.setElement(paramsComboBoxes[i], fieldValues[j]);
          }
        } else if (paramFields && paramFields.length > 0) {
          for (let j = 0; j < fieldValues.length; j++) {
            await paramFields[i].type(fieldValues[j]);
          }
          await paramFields[i].type(this.browser.keys.TAB);
        }
      }
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('saveFilter');
    });
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  private async addOrFilter(path: string) {
    const filterForm = await this.testSubjects.find(`filter-${path}`);
    const addOrBtn = await filterForm.findByTestSubject('add-or-filter');
    await addOrBtn.click();
  }

  private async addAndFilter(path: string) {
    const filterForm = await this.testSubjects.find(`filter-${path}`);
    const addAndBtn = await filterForm.findByTestSubject('add-and-filter');
    await addAndBtn.click();
  }

  private async addConditionalFilter(filter: FilterNode, path: string) {
    if (filter.condition === BooleanRelation.OR) {
      return await this.addOrFilter(path);
    }
    await this.addAndFilter(path);
  }

  private isFilterLeafWithoutValue(filter: FilterLeaf): filter is FilterWithoutValue {
    return !('value' in filter);
  }

  private isFilterWithRange(filter: FilterLeaf): filter is FilterWithRange {
    return (
      'value' in filter &&
      !Array.isArray(filter.value) &&
      typeof filter.value === 'object' &&
      'from' in filter.value &&
      'to' in filter.value
    );
  }

  private async pasteFilterData(filter: FilterLeaf, path: string) {
    const filterForm = await this.testSubjects.find(`filter-${path}`);
    const fieldInput = await filterForm.findByTestSubject('filterFieldSuggestionList');
    await this.comboBox.setElement(fieldInput, filter.field);

    const operatorInput = await filterForm.findByTestSubject('filterOperatorList');
    await this.comboBox.setElement(operatorInput, filter.operation);
    if (this.isFilterLeafWithoutValue(filter)) {
      return;
    }

    if (this.isFilterWithRange(filter)) {
      const startInput = await filterForm.findByTestSubject('range-start');
      const endInput = await filterForm.findByTestSubject('range-end');

      await startInput.type(`${filter.value.from ?? ''}`);
      await endInput.type(`${filter.value.to ?? ''}`);
      return;
    }

    const fieldParams = await filterForm.findByTestSubject('filterParams');
    const filterValueInput = await fieldParams.findByTagName('input');

    if (Array.isArray(filter.value)) {
      for (const value of filter.value) {
        await filterValueInput.type(value);
        await filterValueInput.type(this.browser.keys.ENTER);
      }
      return;
    }

    return await filterValueInput.type(filter.value);
  }

  private isFilterNode(filter: Filter): filter is FilterNode {
    return 'filters' in filter && 'condition' in filter;
  }

  private async createFilter(filter: Filter, path: string = '0'): Promise<unknown> {
    if (this.isFilterNode(filter)) {
      let startedAdding = false;
      for (const [index, f] of filter.filters.entries()) {
        if (index < filter.filters.length - 1) {
          await this.addConditionalFilter(filter, startedAdding ? `${path}.${index}` : path);
        }
        await this.createFilter(f, `${path}.${index}`);
        startedAdding = true;
      }
      return;
    }

    return await this.pasteFilterData(filter, path);
  }

  public async newAddFilterAndSelectDataView(
    dataViewTitle: string | null,
    filter: Filter
  ): Promise<void> {
    await this.openFilterBuilder();

    await this.retry.tryForTime(this.defaultTryTimeout * 2, async () => {
      if (dataViewTitle) {
        await this.comboBox.set('filterIndexPatternsSelect', dataViewTitle);
      }

      await this.createFilter(filter);

      await this.testSubjects.clickWhenNotDisabledWithoutRetry('saveFilter');
    });
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  /**
   * Adds a filter to the filter bar.
   *
   * @param {string} field The name of the field the filter should be applied for.
   * @param {string} operator A valid operator for that fields, e.g. "is one of", "is", "exists", etc.
   * @param {string[]|string} values The remaining parameters are the values passed into the individual
   *   value input fields, i.e. the third parameter into the first input field, the fourth into the second, etc.
   *   Each value itself can be an array, in case you want to enter multiple values into one field (e.g. for "is one of"):
   * @example
   * // Add a plain single value
   * filterBar.addFilter('country', 'is', 'NL');
   * // Add an exists filter
   * filterBar.addFilter('country', 'exists');
   * // Add a range filter for a numeric field
   * filterBar.addFilter('bytes', 'is between', '500', '1000');
   * // Add a filter containing multiple values
   * filterBar.addFilter('extension', 'is one of', ['jpg', 'png']);
   */
  public async addFilter(field: string, operator: string, ...values: any): Promise<void> {
    await this.addFilterAndSelectDataView(null, field, operator, ...values);
  }

  /**
   * Activates filter editing
   * @param key field name
   * @param value field value
   */
  public async clickEditFilter(key: string, value: string): Promise<void> {
    await this.testSubjects.click(`~filter & ~filter-key-${key} & ~filter-value-${value}`);
    await this.testSubjects.click(`editFilter`);
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  /**
   * Returns available phrases in the filter
   */
  public async getFilterEditorSelectedPhrases(): Promise<string[]> {
    return await this.comboBox.getComboBoxSelectedOptions('~filterParamsComboBox');
  }

  /**
   * Returns available fields in the filter
   */
  public async getFilterEditorFields(): Promise<string[]> {
    const optionsString = await this.comboBox.getOptionsList('filterFieldSuggestionList');
    return optionsString.split('\n');
  }

  /**
   * Closes field editor modal window
   */
  public async ensureFieldEditorModalIsClosed(): Promise<void> {
    const cancelSaveFilterModalButtonExists = await this.testSubjects.exists('cancelSaveFilter');
    if (cancelSaveFilterModalButtonExists) {
      await this.testSubjects.click('cancelSaveFilter');
    }
    await this.testSubjects.waitForDeleted('cancelSaveFilter');
  }

  /**
   * Returns comma-separated list of index patterns
   */
  public async getIndexPatterns(): Promise<string> {
    await this.testSubjects.click('addFilter');
    const indexPatterns = await this.comboBox.getOptionsList('filterIndexPatternsSelect');
    await this.ensureFieldEditorModalIsClosed();
    return indexPatterns.trim().split('\n').join(',');
  }
}
