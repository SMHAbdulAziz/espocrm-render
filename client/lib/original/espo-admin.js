define("views/admin/layouts/base", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  /** @module module:views/admin/layouts/base */

  class LayoutBaseView extends _view.default {
    /**
     * @type {string}
     */
    scope;
    /**
     * @type {string}
     */
    type;
    events = {
      /** @this LayoutBaseView */
      'click button[data-action="save"]': function () {
        this.actionSave();
      },
      /** @this LayoutBaseView */
      'click button[data-action="cancel"]': function () {
        this.cancel();
      },
      /** @this LayoutBaseView */
      'click button[data-action="resetToDefault"]': function () {
        this.confirm(this.translate('confirmation', 'messages'), () => {
          this.resetToDefault();
        });
      },
      /** @this LayoutBaseView */
      'click button[data-action="remove"]': function () {
        this.actionDelete();
      }
    };
    buttonList = [{
      name: 'save',
      label: 'Save',
      style: 'primary'
    }, {
      name: 'cancel',
      label: 'Cancel'
    }];

    // noinspection JSUnusedGlobalSymbols
    dataAttributes = null;
    dataAttributesDefs = null;
    dataAttributesDynamicLogicDefs = null;
    setup() {
      this.buttonList = _.clone(this.buttonList);
      this.events = _.clone(this.events);
      this.scope = this.options.scope;
      this.type = this.options.type;
      this.realType = this.options.realType;
      this.setId = this.options.setId;
      this.em = this.options.em;
      const defs = /** @type {Record} */this.getMetadata().get(['clientDefs', this.scope, 'additionalLayouts', this.type]) ?? {};
      this.typeDefs = defs;
      this.dataAttributeList = Espo.Utils.clone(defs.dataAttributeList || this.dataAttributeList);
      this.isCustom = !!defs.isCustom;
      if (this.isCustom && this.em) {
        this.buttonList.push({
          name: 'remove',
          label: 'Remove'
        });
      }
      if (!this.isCustom) {
        this.buttonList.push({
          name: 'resetToDefault',
          label: 'Reset to Default'
        });
      }
    }
    actionSave() {
      this.disableButtons();
      Espo.Ui.notify(this.translate('saving', 'messages'));
      this.save(this.enableButtons.bind(this));
    }
    disableButtons() {
      this.$el.find('.button-container button').attr('disabled', 'disabled');
    }
    enableButtons() {
      this.$el.find('.button-container button').removeAttr('disabled');
    }
    setConfirmLeaveOut(value) {
      this.getRouter().confirmLeaveOut = value;
    }
    setIsChanged() {
      this.isChanged = true;
      this.setConfirmLeaveOut(true);
    }
    setIsNotChanged() {
      this.isChanged = false;
      this.setConfirmLeaveOut(false);
    }
    save(callback) {
      const layout = this.fetch();
      if (!this.validate(layout)) {
        this.enableButtons();
        return false;
      }
      this.getHelper().layoutManager.set(this.scope, this.type, layout, () => {
        Espo.Ui.success(this.translate('Saved'));
        this.setIsNotChanged();
        if (typeof callback === 'function') {
          callback();
        }
        this.getHelper().broadcastChannel.postMessage('update:layout');
      }, this.setId).catch(() => this.enableButtons());
    }
    resetToDefault() {
      this.getHelper().layoutManager.resetToDefault(this.scope, this.type, () => {
        this.loadLayout(() => {
          this.setIsNotChanged();
          this.prepareLayout().then(() => this.reRender());
        });
      }, this.options.setId);
    }
    prepareLayout() {
      return Promise.resolve();
    }
    reset() {
      this.render();
    }
    fetch() {}
    unescape(string) {
      if (string === null) {
        return '';
      }
      const map = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'"
      };
      const reg = new RegExp('(' + _.keys(map).join('|') + ')', 'g');
      return ('' + string).replace(reg, match => {
        return map[match];
      });
    }
    getEditAttributesModalViewOptions(attributes) {
      return {
        name: attributes.name,
        scope: this.scope,
        attributeList: this.dataAttributeList,
        attributeDefs: this.dataAttributesDefs,
        dynamicLogicDefs: this.dataAttributesDynamicLogicDefs,
        attributes: attributes,
        languageCategory: this.languageCategory,
        headerText: ' '
      };
    }
    openEditDialog(attributes) {
      const name = attributes.name;
      const viewOptions = this.getEditAttributesModalViewOptions(attributes);
      this.createView('editModal', 'views/admin/layouts/modals/edit-attributes', viewOptions, view => {
        view.render();
        this.listenToOnce(view, 'after:save', attributes => {
          this.trigger('update-item', name, attributes);
          const $li = $("#layout ul > li[data-name='" + name + "']");
          for (const key in attributes) {
            $li.attr('data-' + key, attributes[key]);
            $li.data(key, attributes[key]);
            $li.find('.' + key + '-value').text(attributes[key]);
          }
          view.close();
          this.setIsChanged();
        });
      });
    }
    cancel() {
      this.loadLayout(() => {
        this.setIsNotChanged();
        if (this.em) {
          this.trigger('cancel');
          return;
        }
        this.prepareLayout().then(() => this.reRender());
      });
    }

    /**
     * @abstract
     * @protected
     * @param {function} callback
     */
    loadLayout(callback) {}

    // noinspection JSUnusedLocalSymbols
    validate(layout) {
      return true;
    }
    actionDelete() {
      this.confirm(this.translate('confirmation', 'messages')).then(() => {
        this.disableButtons();
        Espo.Ui.notify(' ... ');
        Espo.Ajax.postRequest('Layout/action/delete', {
          scope: this.scope,
          name: this.type
        }).then(() => {
          Espo.Ui.success(this.translate('Removed'), {
            suppress: true
          });
          this.trigger('after-delete');
        }).catch(() => {
          this.enableButtons();
        });
      });
    }
  }
  var _default = _exports.default = LayoutBaseView;
});

define("views/admin/layouts/rows", ["exports", "views/admin/layouts/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  /**
   * @abstract
   */
  class LayoutRowsView extends _base.default {
    template = 'admin/layouts/rows';
    dataAttributeList = null;
    dataAttributesDefs = {};
    editable = false;
    data() {
      return {
        scope: this.scope,
        type: this.type,
        buttonList: this.buttonList,
        enabledFields: this.enabledFields,
        disabledFields: this.disabledFields,
        layout: this.rowLayout,
        dataAttributeList: this.dataAttributeList,
        dataAttributesDefs: this.dataAttributesDefs,
        editable: this.editable
      };
    }
    setup() {
      this.itemsData = {};
      super.setup();
      this.events['click a[data-action="editItem"]'] = e => {
        const name = $(e.target).closest('li').data('name');
        this.editRow(name);
      };
      this.on('update-item', (name, attributes) => {
        this.itemsData[name] = Espo.Utils.cloneDeep(attributes);
      });
      Espo.loader.require('res!client/css/misc/layout-manager-rows.css', styleCss => {
        this.$style = $('<style>').html(styleCss).appendTo($('body'));
      });
    }
    onRemove() {
      if (this.$style) {
        this.$style.remove();
      }
    }
    editRow(name) {
      const attributes = Espo.Utils.cloneDeep(this.itemsData[name] || {});
      attributes.name = name;
      this.openEditDialog(attributes);
    }
    afterRender() {
      $('#layout ul.enabled, #layout ul.disabled').sortable({
        connectWith: '#layout ul.connected',
        update: e => {
          if (!$(e.target).hasClass('disabled')) {
            this.onDrop(e);
            this.setIsChanged();
          }
        }
      });
      this.$el.find('.enabled-well').focus();
    }
    onDrop(e) {}
    fetch() {
      const layout = [];
      $("#layout ul.enabled > li").each((i, el) => {
        const o = {};
        const name = $(el).data('name');
        const attributes = this.itemsData[name] || {};
        attributes.name = name;
        this.dataAttributeList.forEach(attribute => {
          const defs = this.dataAttributesDefs[attribute] || {};
          if (defs.notStorable) {
            return;
          }
          const value = attributes[attribute] || null;
          if (value) {
            o[attribute] = value;
          }
        });
        layout.push(o);
      });
      return layout;
    }

    /**
     * @protected
     * @param {Object|Array} layout
     * @return {boolean}
     */
    validate(layout) {
      if (layout.length === 0) {
        Espo.Ui.error(this.translate('cantBeEmpty', 'messages', 'LayoutManager'));
        return false;
      }
      return true;
    }
  }
  var _default = _exports.default = LayoutRowsView;
});

define("views/admin/layouts/side-panels-detail", ["exports", "views/admin/layouts/rows"], function (_exports, _rows) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _rows = _interopRequireDefault(_rows);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutSidePanelsDetailView extends _rows.default {
    dataAttributeList = ['name', 'dynamicLogicVisible', 'style', 'dynamicLogicStyled', 'sticked'];
    dataAttributesDefs = {
      dynamicLogicVisible: {
        type: 'base',
        view: 'views/admin/field-manager/fields/dynamic-logic-conditions',
        tooltip: 'dynamicLogicVisible'
      },
      style: {
        type: 'enum',
        options: ['default', 'success', 'danger', 'warning', 'info'],
        style: {
          'info': 'info',
          'success': 'success',
          'danger': 'danger',
          'warning': 'warning'
        },
        default: 'default',
        translation: 'LayoutManager.options.style',
        tooltip: 'panelStyle'
      },
      dynamicLogicStyled: {
        type: 'base',
        view: 'views/admin/field-manager/fields/dynamic-logic-conditions',
        tooltip: 'dynamicLogicStyled'
      },
      sticked: {
        type: 'bool',
        tooltip: 'sticked'
      },
      name: {
        readOnly: true
      }
    };
    dataAttributesDynamicLogicDefs = {
      fields: {
        dynamicLogicStyled: {
          visible: {
            conditionGroup: [{
              type: 'and',
              value: [{
                attribute: 'style',
                type: 'notEquals',
                value: 'default'
              }, {
                attribute: 'style',
                type: 'isNotEmpty'
              }]
            }]
          }
        }
      }
    };
    editable = true;
    ignoreList = [];
    //ignoreTypeList = []
    viewType = 'detail';
    setup() {
      super.setup();
      this.dataAttributesDefs = Espo.Utils.cloneDeep(this.dataAttributesDefs);
      this.dataAttributesDefs.dynamicLogicVisible.scope = this.scope;
      this.dataAttributesDefs.dynamicLogicStyled.scope = this.scope;
      this.wait(true);
      this.loadLayout(() => {
        this.wait(false);
      });
    }
    loadLayout(callback) {
      this.getHelper().layoutManager.getOriginal(this.scope, this.type, this.setId, layout => {
        this.readDataFromLayout(layout);
        if (callback) {
          callback();
        }
      });
    }

    /**
     * @protected
     * @param {Record.<string, Record>} layout
     * @param {string} type
     * @param {function(): {panelListAll?: string[], params?: Record, labels?: Record}} [hook]
     * @return {{
     *     panelListAll: *[],
     *     disabledFields: *[],
     *     rowLayout: *[],
     *     params: {},
     *     itemsData: {},
     *     labels: {},
     * }}
     */
    getDataFromLayout(layout, type, hook) {
      const panelListAll = [];
      const labels = {};
      const params = {};
      const disabledFields = [];
      const rowLayout = [];
      const itemsData = {};
      layout = Espo.Utils.cloneDeep(layout);
      if (!layout) {
        layout = {};
      }
      if (hook) {
        const additional = hook();
        if (additional.panelListAll) {
          additional.panelListAll.forEach(it => panelListAll.push(it));
        }
        if (additional.params) {
          for (const [key, it] of Object.entries(additional.params)) {
            params[key] = it;
          }
        }
        if (additional.labels) {
          for (const [key, it] of Object.entries(additional.labels)) {
            labels[key] = it;
          }
        }
      }
      (this.getMetadata().get(['clientDefs', this.scope, type, this.viewType]) || []).forEach(/** Record */item => {
        if (item.reference) {
          item = {
            ...this.getMetadata().get(`app.clientRecord.panels.${item.reference}`),
            ...item
          };
        }
        if (!item.name) {
          return;
        }
        panelListAll.push(item.name);
        if (item.labelText) {
          // @todo Revise.
          labels[item.name] = item.labelText;
        }
        if (item.label) {
          labels[item.name] = item.label;
        }
        params[item.name] = item;
      });
      panelListAll.push('_delimiter_');
      if (!layout['_delimiter_']) {
        layout['_delimiter_'] = {
          disabled: true,
          index: 10000
        };
      }
      panelListAll.forEach((item, index) => {
        let disabled = false;
        const itemData = layout[item] || {};
        if (itemData.disabled) {
          disabled = true;
        }
        if (!layout[item]) {
          if ((params[item] || {}).disabled) {
            disabled = true;
          }
        }
        let labelText;
        if (labels[item]) {
          labelText = this.getLanguage().translate(labels[item], 'labels', this.scope);
        } else {
          labelText = this.getLanguage().translate(item, 'panels', this.scope);
        }
        if (disabled) {
          const o = {
            name: item,
            labelText: labelText
          };
          if (o.name[0] === '_') {
            if (o.name === '_delimiter_') {
              o.notEditable = true;
              o.labelText = '. . .';
            }
          }
          disabledFields.push(o);
          return;
        }
        const o = {
          name: item,
          labelText: labelText
        };
        if (o.name[0] === '_') {
          if (o.name === '_delimiter_') {
            o.notEditable = true;
            o.labelText = '. . .';
          }
        }
        if (o.name in params) {
          this.dataAttributeList.forEach(attribute => {
            if (attribute === 'name') {
              return;
            }
            const itemParams = params[o.name] || {};
            if (attribute in itemParams) {
              o[attribute] = itemParams[attribute];
            }
          });
        }
        for (const i in itemData) {
          o[i] = itemData[i];
        }
        o.index = 'index' in itemData ? itemData.index : index;
        rowLayout.push(o);
        itemsData[o.name] = Espo.Utils.cloneDeep(o);
      });
      rowLayout.sort((v1, v2) => v1.index - v2.index);
      disabledFields.sort((v1, v2) => {
        if (v1.name === '_delimiter_') {
          return 1;
        }

        /** @type {string} */
        const label1 = labels[v1.name] || v1.name;
        /** @type {string} */
        const label2 = labels[v2.name] || v2.name;
        return label1.localeCompare(label2);
      });
      return {
        panelListAll,
        labels,
        params,
        disabledFields,
        rowLayout,
        itemsData
      };
    }

    /**
     * @protected
     * @param {Record.<string, Record>} layout
     */
    readDataFromLayout(layout) {
      const data = this.getDataFromLayout(layout, 'sidePanels', () => {
        const panelListAll = [];
        const labels = {};
        if (this.getMetadata().get(`clientDefs.${this.scope}.defaultSidePanel.${this.viewType}`) !== false && !this.getMetadata().get(`clientDefs.${this.scope}.defaultSidePanelDisabled`)) {
          panelListAll.push('default');
          labels['default'] = 'Default';
        }
        return {
          panelListAll,
          labels
        };
      });
      this.disabledFields = data.disabledFields;
      this.rowLayout = data.rowLayout;
      this.itemsData = data.itemsData;
    }
    fetch() {
      const layout = {};
      $('#layout ul.disabled > li').each((i, el) => {
        const name = $(el).attr('data-name');
        layout[name] = {
          disabled: true
        };
      });
      $('#layout ul.enabled > li').each((i, el) => {
        const $el = $(el);
        const o = {};
        const name = $el.attr('data-name');
        const attributes = this.itemsData[name] || {};
        attributes.name = name;
        this.dataAttributeList.forEach(attribute => {
          if (attribute === 'name') {
            return;
          }
          if (attribute in attributes) {
            o[attribute] = attributes[attribute];
          }
        });
        o.index = i;
        layout[name] = o;
      });
      return layout;
    }
  }
  var _default = _exports.default = LayoutSidePanelsDetailView;
});

define("views/admin/dynamic-logic/conditions-string/item-base", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class DynamicLogicConditionsStringItemBaseView extends _view.default {
    template = 'admin/dynamic-logic/conditions-string/item-base';

    /**
     * @type {number}
     */
    level;

    /**
     * @type {string}
     */
    scope;

    /**
     * @type {number}
     */
    number;

    /**
     * @type {string}
     */
    operator;

    /**
     * @type {string}
     */
    operatorString;

    /**
     * @type {
     *     Record &
     *     {
     *         data: {field?: string},
     *         attribute?: string,
     *     }
     * }
     */
    itemData;

    /**
     * @type {Record}
     */
    additionalData;

    /**
     * @type {string}
     */
    field;
    data() {
      return {
        valueViewKey: this.getValueViewKey(),
        scope: this.scope,
        operator: this.operator,
        operatorString: this.operatorString,
        field: this.field,
        leftString: this.getLeftPartString()
      };
    }
    setup() {
      this.itemData = this.options.itemData;
      this.level = this.options.level || 0;
      this.number = this.options.number || 0;
      this.scope = this.options.scope;
      this.operator = this.options.operator || this.operator;
      this.operatorString = this.options.operatorString || this.operatorString;
      this.additionalData = this.itemData.data || {};
      this.field = (this.itemData.data || {}).field || this.itemData.attribute;
      this.wait(true);
      this.isCurrentUser = this.itemData.attribute && this.itemData.attribute.startsWith('$user.');
      if (this.isCurrentUser) {
        this.scope = 'User';
      }
      this.getModelFactory().create(this.scope, model => {
        this.model = model;
        this.populateValues();
        this.createValueFieldView();
        this.wait(false);
      });
    }
    getLeftPartString() {
      if (this.itemData.attribute === '$user.id') {
        return '$' + this.translate('User', 'scopeNames');
      }
      let label = this.translate(this.field, 'fields', this.scope);
      if (this.isCurrentUser) {
        label = '$' + this.translate('User', 'scopeNames') + '.' + label;
      }
      return label;
    }
    populateValues() {
      if (this.itemData.attribute) {
        this.model.set(this.itemData.attribute, this.itemData.value);
      }
      this.model.set(this.additionalData.values || {});
    }
    getValueViewKey() {
      return `view-${this.level.toString()}-${this.number.toString()}-0`;
    }
    getFieldValueView() {
      if (this.itemData.attribute === '$user.id') {
        return 'views/admin/dynamic-logic/fields/user-id';
      }
      const fieldType = this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'type']) || 'base';
      return this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'view']) || this.getFieldManager().getViewName(fieldType);
    }
    createValueFieldView() {
      const key = this.getValueViewKey();
      const viewName = this.getFieldValueView();
      this.createView('value', viewName, {
        model: this.model,
        name: this.field,
        selector: `[data-view-key="${key}"]`,
        readOnly: true
      });
    }
  }
  _exports.default = DynamicLogicConditionsStringItemBaseView;
});

define("views/admin/link-manager/modals/edit-params", ["exports", "views/modal", "model", "views/record/edit-for-modal", "views/fields/bool"], function (_exports, _modal, _model, _editForModal, _bool) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  _model = _interopRequireDefault(_model);
  _editForModal = _interopRequireDefault(_editForModal);
  _bool = _interopRequireDefault(_bool);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LinkManagerEditParamsModalView extends _modal.default {
    templateContent = `
        <div class="record no-side-margin">{{{record}}}</div>
    `;

    /**
     * @private
     * @type {string}
     */
    type;

    /**
     * @param {{
     *     entityType: string,
     *     link: string,
     * }} props
     */
    constructor(props) {
      super();
      this.props = props;
    }
    setup() {
      this.headerText = this.translate('Parameters', 'labels', 'EntityManager') + ' · ' + this.translate(this.props.entityType, 'scopeNames') + ' · ' + this.translate(this.props.link, 'links', this.props.entityType);

      /** @type {{type: string, isCustom: boolean}} */
      const defs = this.getMetadata().get(`entityDefs.${this.props.entityType}.links.${this.props.link}`) || {};
      this.type = defs.type;
      this.buttonList = [{
        name: 'save',
        style: 'danger',
        label: 'Save',
        onClick: () => this.save()
      }, {
        name: 'cancel',
        label: 'Cancel',
        onClick: () => this.close()
      }];
      if (!defs.isCustom) {
        this.addDropdownItem({
          name: 'resetToDefault',
          text: this.translate('Reset to Default', 'labels', 'Admin'),
          onClick: () => this.resetToDefault()
        });
      }
      this.formModel = new _model.default(this.getParamsFromMetadata());
      this.recordView = new _editForModal.default({
        model: this.formModel,
        detailLayout: [{
          rows: [[{
            view: new _bool.default({
              name: 'readOnly',
              labelText: this.translate('readOnly', 'fields', 'Admin'),
              params: {
                tooltip: 'EntityManager.linkParamReadOnly'
              }
            })
          }, false]]
        }]
      });
      if (!this.hasReadOnly()) {
        this.recordView.hideField('readOnly');
        this.recordView.setFieldReadOnly('readOnly');
      }
      this.assignView('record', this.recordView, '.record');
    }

    /**
     * @private
     * @return {boolean}
     */
    hasReadOnly() {
      return ['hasMany', 'hasChildren'].includes(this.type);
    }

    /**
     * @private
     * @return {Record}
     */
    getParamsFromMetadata() {
      /** @type {Record} */
      const defs = this.getMetadata().get(`entityDefs.${this.props.entityType}.links.${this.props.link}`) || {};
      return {
        readOnly: defs.readOnly || false
      };
    }

    /**
     * @private
     */
    disableAllActionItems() {
      this.disableButton('save');
      this.hideActionItem('resetToDefault');
    }

    /**
     * @private
     */
    enableAllActionItems() {
      this.enableButton('save');
      this.showActionItem('resetToDefault');
    }

    /**
     * @private
     */
    async save() {
      if (this.recordView.validate()) {
        return;
      }
      this.disableAllActionItems();
      Espo.Ui.notify(' ... ');
      const params = {};
      if (this.hasReadOnly()) {
        params.readOnly = this.formModel.attributes.readOnly;
      }
      try {
        await Espo.Ajax.postRequest('EntityManager/action/updateLinkParams', {
          entityType: this.props.entityType,
          link: this.props.link,
          params: params
        });
      } catch (e) {
        this.enableAllActionItems();
        return;
      }
      await Promise.all([this.getMetadata().loadSkipCache()]);
      this.broadcastUpdate();
      this.close();
      Espo.Ui.success(this.translate('Saved'));
    }

    /**
     * @private
     */
    async resetToDefault() {
      this.disableAllActionItems();
      Espo.Ui.notify(' ... ');
      try {
        await Espo.Ajax.postRequest('EntityManager/action/resetLinkParamsToDefault', {
          entityType: this.props.entityType,
          link: this.props.link
        });
      } catch (e) {
        this.enableAllActionItems();
        return;
      }
      await Promise.all([this.getMetadata().loadSkipCache()]);
      this.broadcastUpdate();
      this.formModel.setMultiple(this.getParamsFromMetadata());
      this.enableAllActionItems();
      Espo.Ui.success(this.translate('Saved'));
    }

    /**
     * @private
     */
    broadcastUpdate() {
      this.getHelper().broadcastChannel.postMessage('update:metadata');
    }
  }
  _exports.default = LinkManagerEditParamsModalView;
});

define("views/admin/layouts/grid", ["exports", "views/admin/layouts/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  /**
   * @abstract
   */
  class LayoutGridView extends _base.default {
    template = 'admin/layouts/grid';
    dataAttributeList = null;
    panels = null;
    columnCount = 2;
    panelDataAttributeList = ['panelName', 'style'];
    panelDataAttributesDefs = {};
    panelDynamicLogicDefs = null;
    data() {
      return {
        scope: this.scope,
        type: this.type,
        buttonList: this.buttonList,
        enabledFields: this.enabledFields,
        disabledFields: this.disabledFields,
        panels: this.panels,
        columnCount: this.columnCount,
        panelDataList: this.getPanelDataList()
      };
    }
    additionalEvents = {
      /** @this LayoutGridView */
      'click #layout a[data-action="addPanel"]': function () {
        this.addPanel();
        this.setIsChanged();
        this.makeDraggable();
      },
      /** @this LayoutGridView */
      'click #layout a[data-action="removePanel"]': function (e) {
        $(e.target).closest('ul.panels > li').find('ul.cells > li').each((i, li) => {
          if ($(li).attr('data-name')) {
            $(li).appendTo($('#layout ul.disabled'));
          }
        });
        $(e.target).closest('ul.panels > li').remove();
        const number = $(e.currentTarget).data('number');
        this.clearView('panels-' + number);
        let index = -1;
        this.panels.forEach((item, i) => {
          if (item.number === number) {
            index = i;
          }
        });
        if (~index) {
          this.panels.splice(index, 1);
        }
        this.normalizeDisabledItemList();
        this.setIsChanged();
      },
      /** @this LayoutGridView */
      'click #layout a[data-action="addRow"]': function (e) {
        const tpl = this.unescape($("#layout-row-tpl").html());
        const html = _.template(tpl);
        $(e.target).closest('ul.panels > li').find('ul.rows').append(html);
        this.setIsChanged();
        this.makeDraggable();
      },
      /** @this LayoutGridView */
      'click #layout a[data-action="removeRow"]': function (e) {
        $(e.target).closest('ul.rows > li').find('ul.cells > li').each((i, li) => {
          if ($(li).attr('data-name')) {
            $(li).appendTo($('#layout ul.disabled'));
          }
        });
        $(e.target).closest('ul.rows > li').remove();
        this.normalizeDisabledItemList();
        this.setIsChanged();
      },
      /** @this LayoutGridView */
      'click #layout a[data-action="removeField"]': function (e) {
        const $li = $(e.target).closest('li');
        const index = $li.index();
        const $ul = $li.parent();
        $li.appendTo($('ul.disabled'));
        const $empty = $($('#empty-cell-tpl').html());
        if (parseInt($ul.attr('data-cell-count')) === 1) {
          for (let i = 0; i < this.columnCount; i++) {
            $ul.append($empty.clone());
          }
        } else {
          if (index === 0) {
            $ul.prepend($empty);
          } else {
            $empty.insertAfter($ul.children(':nth-child(' + index + ')'));
          }
        }
        const cellCount = $ul.children().length;
        $ul.attr('data-cell-count', cellCount.toString());
        $ul.closest('li').attr('data-cell-count', cellCount.toString());
        this.setIsChanged();
        this.makeDraggable();
      },
      /** @this LayoutGridView */
      'click #layout a[data-action="minusCell"]': function (e) {
        if (this.columnCount < 2) {
          return;
        }
        const $li = $(e.currentTarget).closest('li');
        const $ul = $li.parent();
        $li.remove();
        const cellCount = $ul.children().length || 2;
        this.setIsChanged();
        this.makeDraggable();
        $ul.attr('data-cell-count', cellCount.toString());
        $ul.closest('li').attr('data-cell-count', cellCount.toString());
      },
      /** @this LayoutGridView */
      'click #layout a[data-action="plusCell"]': function (e) {
        const $li = $(e.currentTarget).closest('li');
        const $ul = $li.find('ul');
        const $empty = $($('#empty-cell-tpl').html());
        $ul.append($empty);
        const cellCount = $ul.children().length;
        $ul.attr('data-cell-count', cellCount.toString());
        $ul.closest('li').attr('data-cell-count', cellCount.toString());
        this.setIsChanged();
        this.makeDraggable();
      },
      /** @this LayoutGridView */
      'click #layout a[data-action="edit-panel-label"]': function (e) {
        const $header = $(e.target).closest('header');
        const $label = $header.children('label');
        const panelName = $label.text();
        const $panel = $header.closest('li');
        const id = $panel.data('number').toString();
        const attributes = {
          panelName: panelName
        };
        this.panelDataAttributeList.forEach(item => {
          if (item === 'panelName') {
            return;
          }
          attributes[item] = this.panelsData[id][item];
        });
        const attributeList = this.panelDataAttributeList;
        const attributeDefs = this.panelDataAttributesDefs;
        this.createView('dialog', 'views/admin/layouts/modals/panel-attributes', {
          attributeList: attributeList,
          attributeDefs: attributeDefs,
          attributes: attributes,
          dynamicLogicDefs: this.panelDynamicLogicDefs
        }, view => {
          view.render();
          this.listenTo(view, 'after:save', attributes => {
            $label.text(attributes.panelName);
            $label.attr('data-is-custom', 'true');
            this.panelDataAttributeList.forEach(item => {
              if (item === 'panelName') {
                return;
              }
              this.panelsData[id][item] = attributes[item];
            });
            $panel.attr('data-tab-break', attributes.tabBreak ? 'true' : false);
            view.close();
            this.$el.find('.well').focus();
            this.setIsChanged();
          });
        });
      }
    };
    normalizeDisabledItemList() {
      //$('#layout ul.cells.disabled > li').each((i, el) => {});
    }
    setup() {
      super.setup();
      this.events = {
        ...this.additionalEvents,
        ...this.events
      };
      this.panelsData = {};
      Espo.loader.require('res!client/css/misc/layout-manager-grid.css', styleCss => {
        this.$style = $('<style>').html(styleCss).appendTo($('body'));
      });
    }
    onRemove() {
      if (this.$style) this.$style.remove();
    }
    addPanel() {
      this.lastPanelNumber++;
      const number = this.lastPanelNumber;
      const data = {
        customLabel: null,
        rows: [[]],
        number: number
      };
      this.panels.push(data);
      const attributes = {};
      for (const attribute in this.panelDataAttributesDefs) {
        const item = this.panelDataAttributesDefs[attribute];
        if ('default' in item) {
          attributes[attribute] = item.default;
        }
      }
      this.panelsData[number.toString()] = attributes;
      const $li = $('<li class="panel-layout"></li>');
      $li.attr('data-number', number);
      this.$el.find('ul.panels').append($li);
      this.createPanelView(data, true, view => {
        view.render();
      });
    }
    getPanelDataList() {
      const panelDataList = [];
      this.panels.forEach(item => {
        const o = {};
        o.viewKey = 'panel-' + item.number;
        o.number = item.number;
        o.tabBreak = !!item.tabBreak;
        panelDataList.push(o);
      });
      return panelDataList;
    }
    prepareLayout() {
      return new Promise(resolve => {
        let countLoaded = 0;
        this.setupPanels(() => {
          countLoaded++;
          if (countLoaded === this.panels.length) {
            resolve();
          }
        });
      });
    }
    setupPanels(callback) {
      this.lastPanelNumber = -1;
      this.panels = Espo.Utils.cloneDeep(this.panels);
      this.panels.forEach((panel, i) => {
        panel.number = i;
        this.lastPanelNumber++;
        this.createPanelView(panel, false, callback);
        this.panelsData[i.toString()] = panel;
      });
    }
    createPanelView(data, empty, callback) {
      data.label = data.label || '';
      data.isCustomLabel = false;
      if (data.customLabel) {
        data.labelTranslated = data.customLabel;
        data.isCustomLabel = true;
      } else {
        data.labelTranslated = this.translate(data.label, 'labels', this.scope);
      }
      data.style = data.style || null;
      data.rows.forEach(row => {
        const rest = this.columnCount - row.length;
        if (empty) {
          for (let i = 0; i < rest; i++) {
            row.push(false);
          }
        }
        for (const i in row) {
          if (row[i] !== false) {
            row[i].label = this.getLanguage().translate(row[i].name, 'fields', this.scope);
            if ('customLabel' in row[i]) {
              row[i].hasCustomLabel = true;
            }
          }
        }
      });
      this.createView('panel-' + data.number, 'view', {
        selector: 'li.panel-layout[data-number="' + data.number + '"]',
        template: 'admin/layouts/grid-panel',
        data: () => {
          const o = Espo.Utils.clone(data);
          o.dataAttributeList = [];
          this.panelDataAttributeList.forEach(item => {
            if (item === 'panelName') {
              return;
            }
            o.dataAttributeList.push(item);
          });
          return o;
        }
      }, callback);
    }
    makeDraggable() {
      const self = this;
      const $panels = $('#layout ul.panels');
      const $rows = $('#layout ul.rows');
      $panels.sortable({
        distance: 4,
        update: () => {
          this.setIsChanged();
        }
      });

      // noinspection JSUnresolvedReference
      $panels.disableSelection();
      $rows.sortable({
        distance: 4,
        connectWith: '.rows',
        update: () => {
          this.setIsChanged();
        }
      });

      // noinspection JSUnresolvedReference
      $rows.disableSelection();
      const $li = $('#layout ul.cells > li');

      // noinspection JSValidateTypes
      $li.draggable({
        revert: 'invalid',
        revertDuration: 200,
        zIndex: 10
      }).css('cursor', 'pointer');
      $li.droppable().droppable('destroy');
      $('#layout ul.cells:not(.disabled) > li').droppable({
        accept: '.cell',
        zIndex: 10,
        hoverClass: 'ui-state-hover',
        drop: function (e, ui) {
          const index = ui.draggable.index();
          const parent = ui.draggable.parent();
          if (parent.get(0) === $(this).parent().get(0)) {
            if ($(this).index() < ui.draggable.index()) {
              $(this).before(ui.draggable);
            } else {
              $(this).after(ui.draggable);
            }
          } else {
            ui.draggable.insertAfter($(this));
            if (index === 0) {
              $(this).prependTo(parent);
            } else {
              $(this).insertAfter(parent.children(':nth-child(' + index + ')'));
            }
          }
          ui.draggable.css({
            top: 0,
            left: 0
          });
          if ($(this).parent().hasClass('disabled') && !$(this).data('name')) {
            $(this).remove();
          }
          self.makeDraggable();
          self.setIsChanged();
        }
      });
    }
    afterRender() {
      this.makeDraggable();
      const wellElement = /** @type {HTMLElement} */this.$el.find('.enabled-well').get(0);
      wellElement.focus({
        preventScroll: true
      });
    }
    fetch() {
      const layout = [];
      $("#layout ul.panels > li").each((i, el) => {
        const $label = $(el).find('header label');
        const id = $(el).data('number').toString();
        const o = {
          rows: []
        };
        this.panelDataAttributeList.forEach(item => {
          if (item === 'panelName') {
            return;
          }
          o[item] = this.panelsData[id][item];
        });
        o.style = o.style || 'default';
        const name = $(el).find('header').data('name');
        if (name) {
          o.name = name;
        }
        if ($label.attr('data-is-custom')) {
          o.customLabel = $label.text();
        } else {
          o.label = $label.data('label');
        }
        $(el).find('ul.rows > li').each((i, li) => {
          const row = [];
          $(li).find('ul.cells > li').each((i, li) => {
            let cell = false;
            if (!$(li).hasClass('empty')) {
              cell = {};
              this.dataAttributeList.forEach(attr => {
                const defs = this.dataAttributesDefs[attr] || {};
                if (defs.notStorable) {
                  return;
                }
                if (attr === 'customLabel') {
                  if ($(li).get(0).hasAttribute('data-custom-label')) {
                    cell[attr] = $(li).attr('data-custom-label');
                  }
                  return;
                }
                const value = $(li).data(Espo.Utils.toDom(attr)) || null;
                if (value) {
                  cell[attr] = value;
                }
              });
            }
            row.push(cell);
          });
          o.rows.push(row);
        });
        layout.push(o);
      });
      return layout;
    }
    validate(layout) {
      let fieldCount = 0;
      layout.forEach(panel => {
        panel.rows.forEach(row => {
          row.forEach(cell => {
            if (cell !== false && cell !== null) {
              fieldCount++;
            }
          });
        });
      });
      if (fieldCount === 0) {
        Espo.Ui.error(this.translate('cantBeEmpty', 'messages', 'LayoutManager'));
        return false;
      }
      return true;
    }
  }
  var _default = _exports.default = LayoutGridView;
});

define("views/admin/layouts/default-page", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutDefaultPageView extends _view.default {
    // language=Handlebars
    templateContent = `
        <div class="margin-bottom">{{translate 'selectLayout' category='messages' scope='Admin'}}</div>
        <div class="button-container">
            <button data-action="createLayout" class="btn btn-link">{{translate 'Create'}}</button>
        </div>
    `;
  }
  var _default = _exports.default = LayoutDefaultPageView;
});

define("views/admin/layouts/bottom-panels-detail", ["exports", "views/admin/layouts/side-panels-detail"], function (_exports, _sidePanelsDetail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _sidePanelsDetail = _interopRequireDefault(_sidePanelsDetail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutBottomPanelsDetail extends _sidePanelsDetail.default {
    hasStream = true;
    hasRelationships = true;
    TAB_BREAK_KEY = '_tabBreak_{n}';
    setup() {
      super.setup();
      this.on('update-item', (name, attributes) => {
        if (this.isTabName(name)) {
          const $li = $("#layout ul > li[data-name='" + name + "']");
          $li.find('.left > span').text(this.composeTabBreakLabel(attributes));
        }
      });
    }
    composeTabBreakLabel(item) {
      let label = '. . . ' + this.translate('tabBreak', 'fields', 'LayoutManager');
      if (item.tabLabel) {
        label += ' : ' + item.tabLabel;
      }
      return label;
    }

    /**
     * @protected
     * @param {Record.<string, Record>} layout
     */
    readDataFromLayout(layout) {
      const data = this.getDataFromLayout(layout, 'bottomPanels', () => {
        const panelListAll = [];
        const labels = {};
        const params = {};
        if (this.hasStream && (this.getMetadata().get(`scopes.${this.scope}.stream`) || this.scope === 'User')) {
          panelListAll.push('stream');
          labels['stream'] = this.translate('Stream');
          params['stream'] = {
            name: 'stream',
            sticked: false,
            index: 2
          };
        }
        this.links = {};
        if (this.hasRelationships) {
          /** @type {Record<string, Record>} */
          const linkDefs = this.getMetadata().get(`entityDefs.${this.scope}.links`) || {};
          Object.keys(linkDefs).forEach(link => {
            if (linkDefs[link].disabled || linkDefs[link].utility || linkDefs[link].layoutRelationshipsDisabled) {
              return;
            }
            if (!['hasMany', 'hasChildren'].includes(linkDefs[link].type)) {
              return;
            }
            panelListAll.push(link);
            labels[link] = this.translate(link, 'links', this.scope);
            const item = {
              name: link,
              index: 5
            };
            this.dataAttributeList.forEach(attribute => {
              if (attribute in item) {
                return;
              }
              const value = this.getMetadata().get(['clientDefs', this.scope, 'relationshipPanels', item.name, attribute]);
              if (value === null) {
                return;
              }
              item[attribute] = value;
            });
            this.links[link] = true;
            params[item.name] = item;
            if (!(item.name in layout)) {
              item.disabled = true;
            }
          });
        }
        panelListAll.push(this.TAB_BREAK_KEY);
        labels[this.TAB_BREAK_KEY] = '. . . ' + this.translate('tabBreak', 'fields', 'LayoutManager');
        params[this.TAB_BREAK_KEY] = {
          disabled: true
        };
        for (const name in layout) {
          const item = layout[name];
          if (item.tabBreak) {
            panelListAll.push(name);
            labels[name] = this.composeTabBreakLabel(item);
            params[name] = {
              name: item.name,
              index: item.index,
              tabBreak: true,
              tabLabel: item.tabLabel || null
            };
          }
        }
        return {
          panelListAll,
          labels,
          params
        };
      });
      this.disabledFields = data.disabledFields;
      this.rowLayout = data.rowLayout;
      this.itemsData = data.itemsData;
    }
    onDrop() {
      let tabBreakIndex = -1;
      let $tabBreak = null;
      this.$el.find('ul.enabled').children().each((i, li) => {
        const $li = $(li);
        const name = $li.attr('data-name');
        if (this.isTabName(name)) {
          if (name !== this.TAB_BREAK_KEY) {
            const itemIndex = parseInt(name.split('_')[2]);
            if (itemIndex > tabBreakIndex) {
              tabBreakIndex = itemIndex;
            }
          }
        }
      });
      tabBreakIndex++;
      this.$el.find('ul.enabled').children().each((i, li) => {
        const $li = $(li);
        const name = $li.attr('data-name');
        if (this.isTabName(name) && name === this.TAB_BREAK_KEY) {
          $tabBreak = $li.clone();
          const realName = this.TAB_BREAK_KEY.slice(0, -3) + tabBreakIndex;
          $li.attr('data-name', realName);
          delete this.itemsData[realName];
        }
      });
      if (!$tabBreak) {
        this.$el.find('ul.disabled').children().each((i, li) => {
          const $li = $(li);
          const name = $li.attr('data-name');
          if (this.isTabName(name) && name !== this.TAB_BREAK_KEY) {
            $li.remove();
          }
        });
      }
      if ($tabBreak) {
        $tabBreak.prependTo(this.$el.find('ul.disabled'));
      }
    }
    isTabName(name) {
      return name.substring(0, this.TAB_BREAK_KEY.length - 3) === this.TAB_BREAK_KEY.slice(0, -3);
    }
    getEditAttributesModalViewOptions(attributes) {
      const options = super.getEditAttributesModalViewOptions(attributes);
      if (this.isTabName(attributes.name)) {
        options.attributeList = ['tabLabel'];
        options.attributeDefs = {
          tabLabel: {
            type: 'varchar'
          }
        };
      }
      return options;
    }
    fetch() {
      const layout = super.fetch();
      const newLayout = {};
      for (const name in layout) {
        if (layout[name].disabled && this.links[name]) {
          continue;
        }
        newLayout[name] = layout[name];
        if (this.isTabName(name) && name !== this.TAB_BREAK_KEY /*&& this.itemsData[name]*/) {
          const data = this.itemsData[name] || {};
          newLayout[name].tabBreak = true;
          newLayout[name].tabLabel = data.tabLabel;
        } else {
          delete newLayout[name].tabBreak;
          delete newLayout[name].tabLabel;
        }
      }
      delete newLayout[this.TAB_BREAK_KEY];
      return newLayout;
    }
    validate(layout) {
      if (!super.validate(layout)) {
        return false;
      }
      return true;
    }
  }
  var _default = _exports.default = LayoutBottomPanelsDetail;
});

define("views/admin/layouts/modals/create", ["exports", "views/modal", "views/record/edit-for-modal", "model", "views/fields/enum", "views/fields/varchar"], function (_exports, _modal, _editForModal, _model, _enum, _varchar) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  _editForModal = _interopRequireDefault(_editForModal);
  _model = _interopRequireDefault(_model);
  _enum = _interopRequireDefault(_enum);
  _varchar = _interopRequireDefault(_varchar);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  /** @module views/admin/layouts/modals/create */

  class LayoutCreateModalView extends _modal.default {
    // language=Handlebars
    templateContent = `
        <div class="complex-text-container">{{complexText info}}</div>
        <div class="record no-side-margin">{{{record}}}</div>
    `;
    className = 'dialog dialog-record';

    /**
     * @typedef {Object} module:views/admin/layouts/modals/create~data
     * @property {string} type
     * @property {string} name
     * @property {string} label
     */

    /**
     * @param {{scope: string}} options
     */
    constructor(options) {
      super();
      this.scope = options.scope;
    }
    data() {
      return {
        info: this.translate('createInfo', 'messages', 'LayoutManager')
      };
    }
    setup() {
      this.headerText = this.translate('Create');
      this.buttonList = [{
        name: 'create',
        style: 'danger',
        label: 'Create',
        onClick: () => this.actionCreate()
      }, {
        name: 'cancel',
        label: 'Cancel'
      }];
      this.model = new _model.default({
        type: 'list',
        name: 'listForMyEntityType',
        label: 'List (for MyEntityType)'
      });
      this.recordView = new _editForModal.default({
        model: this.model,
        detailLayout: [{
          columns: [[{
            view: new _enum.default({
              name: 'type',
              params: {
                readOnly: true,
                translation: 'Admin.layouts',
                options: ['list']
              },
              labelText: this.translate('type', 'fields', 'Admin')
            })
          }, {
            view: new _varchar.default({
              name: 'name',
              params: {
                required: true,
                noSpellCheck: true,
                pattern: '$latinLetters'
              },
              labelText: this.translate('name', 'fields')
            })
          }, {
            view: new _varchar.default({
              name: 'label',
              params: {
                required: true,
                pattern: '$noBadCharacters'
              },
              labelText: this.translate('label', 'fields', 'Admin')
            })
          }], []]
        }]
      });
      this.assignView('record', this.recordView, '.record');
    }
    actionCreate() {
      this.recordView.fetch();
      if (this.recordView.validate()) {
        return;
      }
      this.disableButton('create');
      Espo.Ui.notify(' ... ');
      Espo.Ajax.postRequest('Layout/action/create', {
        scope: this.scope,
        type: this.model.get('type'),
        name: this.model.get('name'),
        label: this.model.get('label')
      }).then(() => {
        this.reRender();
        Espo.Ui.success('Created', {
          suppress: true
        });
        this.trigger('done');
        this.close();
      }).catch(() => {
        this.enableButton('create');
      });
    }
  }
  var _default = _exports.default = LayoutCreateModalView;
});

define("views/admin/dynamic-logic/conditions-string/item-operator-only-base", ["exports", "views/admin/dynamic-logic/conditions-string/item-base"], function (_exports, _itemBase) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _itemBase = _interopRequireDefault(_itemBase);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _itemBase.default {
    template = 'admin/dynamic-logic/conditions-string/item-operator-only-base';
    createValueFieldView() {}
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions/field-types/base", ["exports", "view", "ui/select"], function (_exports, _view, _select) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _select = _interopRequireDefault(_select);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class DynamicLogicConditionFieldTypeBaseView extends _view.default {
    template = 'admin/dynamic-logic/conditions/field-types/base';

    /**
     * @protected
     * @type {Record}
     */
    itemData;

    /**
     * @protected
     * @type {Record}
     */
    additionalData;

    /**
     * @type {string}
     */
    type;

    /**
     * @type {string}
     */
    field;

    /**
     * @type {string}
     */
    scope;
    events = {
      'click > div > div > [data-action="remove"]': function (e) {
        e.stopPropagation();
        this.trigger('remove-item');
      }
    };
    data() {
      return {
        type: this.type,
        field: this.field,
        scope: this.scope,
        typeList: this.typeList,
        leftString: this.translateLeftString()
      };
    }
    translateLeftString() {
      return this.translate(this.field, 'fields', this.scope);
    }
    setup() {
      this.type = this.options.type;
      this.field = this.options.field;
      this.scope = this.options.scope;
      this.fieldType = this.options.fieldType;
      this.itemData = this.options.itemData;
      this.additionalData = this.itemData.data || {};
      this.typeList = this.getMetadata().get(['clientDefs', 'DynamicLogic', 'fieldTypes', this.fieldType, 'typeList']);
      this.wait(true);
      this.createModel().then(model => {
        this.model = model;
        this.populateValues();
        this.manageValue();
        this.wait(false);
      });
    }
    createModel() {
      return this.getModelFactory().create(this.scope);
    }
    afterRender() {
      this.$type = this.$el.find('select[data-name="type"]');
      _select.default.init(this.$type.get(0));
      this.$type.on('change', () => {
        this.type = this.$type.val();
        this.manageValue();
      });
    }
    populateValues() {
      if (this.itemData.attribute) {
        this.model.set(this.itemData.attribute, this.itemData.value);
      }
      this.model.set(this.additionalData.values || {});
    }
    getValueViewName() {
      const fieldType = this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'type']) || 'base';
      return this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'view']) || this.getFieldManager().getViewName(fieldType);
    }
    getValueFieldName() {
      return this.field;
    }
    manageValue() {
      const valueType = this.getMetadata().get(['clientDefs', 'DynamicLogic', 'fieldTypes', this.fieldType, 'conditionTypes', this.type, 'valueType']) || this.getMetadata().get(['clientDefs', 'DynamicLogic', 'conditionTypes', this.type, 'valueType']);
      if (valueType === 'field') {
        const viewName = this.getValueViewName();
        const fieldName = this.getValueFieldName();
        this.createView('value', viewName, {
          model: this.model,
          name: fieldName,
          selector: '.value-container',
          mode: 'edit',
          readOnlyDisabled: true
        }, view => {
          if (this.isRendered()) {
            view.render();
          }
        });
      } else if (valueType === 'custom') {
        this.clearView('value');
        const methodName = 'createValueView' + Espo.Utils.upperCaseFirst(this.type);
        this[methodName]();
      } else if (valueType === 'varchar') {
        this.createView('value', 'views/fields/varchar', {
          model: this.model,
          name: this.getValueFieldName(),
          selector: '.value-container',
          mode: 'edit',
          readOnlyDisabled: true
        }, view => {
          if (this.isRendered()) {
            view.render();
          }
        });
      } else {
        this.clearView('value');
      }
    }
    fetch() {
      const valueView = this.getView('value');
      const item = {
        type: this.type,
        attribute: this.field
      };
      if (valueView) {
        valueView.fetchToModel();
        item.value = this.model.get(this.field);
      }
      return item;
    }
  }
  _exports.default = DynamicLogicConditionFieldTypeBaseView;
});

define("views/outbound-email/fields/test-send", ["exports", "views/fields/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    templateContent = '<button class="btn btn-default hidden" data-action="sendTestEmail">' + '{{translate \'Send Test Email\' scope=\'Email\'}}</button>';
    setup() {
      super.setup();
      this.addActionHandler('sendTestEmail', () => this.send());
    }
    fetch() {
      return {};
    }

    /**
     * @protected
     */
    checkAvailability() {
      if (this.model.get('smtpServer')) {
        this.$el.find('button').removeClass('hidden');
      } else {
        this.$el.find('button').addClass('hidden');
      }
    }
    afterRender() {
      this.checkAvailability();
      this.stopListening(this.model, 'change:smtpServer');
      this.listenTo(this.model, 'change:smtpServer', () => {
        this.checkAvailability();
      });
    }

    /**
     * @protected
     * @return {Record}
     */
    getSmtpData() {
      return {
        'server': this.model.get('smtpServer'),
        'port': this.model.get('smtpPort'),
        'auth': this.model.get('smtpAuth'),
        'security': this.model.get('smtpSecurity'),
        'username': this.model.get('smtpUsername'),
        'password': this.model.get('smtpPassword') || null,
        'fromName': this.model.get('outboundEmailFromName'),
        'fromAddress': this.model.get('outboundEmailFromAddress'),
        'type': 'outboundEmail'
      };
    }

    /**
     * @protected
     */
    enableButton() {
      this.$el.find('button').removeClass('disabled').removeAttr('disabled');
    }

    /**
     * @protected
     */
    disabledButton() {
      this.$el.find('button').addClass('disabled').attr('disabled', 'disabled');
    }

    /**
     * @private
     */
    send() {
      const data = this.getSmtpData();
      this.createView('popup', 'views/outbound-email/modals/test-send', {
        emailAddress: this.getUser().get('emailAddress')
      }, view => {
        view.render();
        this.listenToOnce(view, 'send', emailAddress => {
          this.disabledButton();
          data.emailAddress = emailAddress;
          this.notify('Sending...');
          view.close();
          Espo.Ajax.postRequest('Email/sendTest', data).then(() => {
            this.enableButton();
            Espo.Ui.success(this.translate('testEmailSent', 'messages', 'Email'));
          }).catch(xhr => {
            let reason = xhr.getResponseHeader('X-Status-Reason') || '';
            reason = reason.replace(/ $/, '').replace(/,$/, '');
            let msg = this.translate('Error');
            if (xhr.status !== 200) {
              msg += ' ' + xhr.status;
            }
            if (xhr.responseText) {
              try {
                const data = /** @type {Record} */JSON.parse(xhr.responseText);
                if (data.messageTranslation) {
                  this.enableButton();
                  return;
                }
                reason = data.message || reason;
              } catch (e) {
                this.enableButton();
                console.error('Could not parse error response body.');
                return;
              }
            }
            if (reason) {
              msg += ': ' + reason;
            }
            Espo.Ui.error(msg, true);
            console.error(msg);
            xhr.errorIsHandled = true;
            this.enableButton();
          });
        });
      });
    }
  }
  _exports.default = _default;
});

define("views/settings/edit", ["exports", "views/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class SettingsEditView extends _edit.default {
    scope = 'Settings';
    setupHeader() {
      this.createView('header', this.headerView, {
        model: this.model,
        fullSelector: '#main > .header',
        template: this.options.headerTemplate,
        label: this.options.label
      });
    }
  }
  var _default = _exports.default = SettingsEditView;
});

define("views/settings/record/edit", ["exports", "views/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class SettingsEditRecordView extends _edit.default {
    saveAndContinueEditingAction = false;
    sideView = null;
    layoutName = 'settings';
    setup() {
      super.setup();
      this.listenTo(this.model, 'after:save', () => {
        this.getConfig().set(this.model.getClonedAttributes());
      });
    }
    exit(after) {
      if (after === 'cancel') {
        this.getRouter().navigate('#Admin', {
          trigger: true
        });
      }
    }
  }
  var _default = _exports.default = SettingsEditRecordView;
});

define("views/settings/fields/quick-create-list", ["exports", "views/fields/array"], function (_exports, _array) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _array = _interopRequireDefault(_array);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class SettingsQuickCreateListFieldView extends _array.default {
    setup() {
      this.params.options = Object.keys(this.getMetadata().get('scopes')).filter(scope => {
        if (this.getMetadata().get(`scopes.${scope}.disabled`)) {
          return;
        }
        return this.getMetadata().get(`scopes.${scope}.entity`) && this.getMetadata().get(`scopes.${scope}.object`);
      }).sort((v1, v2) => {
        return this.translate(v1, 'scopeNamesPlural').localeCompare(this.translate(v2, 'scopeNamesPlural'));
      });
      super.setup();
    }
  }
  _exports.default = SettingsQuickCreateListFieldView;
});

define("views/role/record/table", ["exports", "view", "model", "views/fields/enum", "view-record-helper"], function (_exports, _view, _model, _enum, _viewRecordHelper) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _model = _interopRequireDefault(_model);
  _enum = _interopRequireDefault(_enum);
  _viewRecordHelper = _interopRequireDefault(_viewRecordHelper);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class RoleRecordTableView extends _view.default {
    template = 'role/table';

    /**
     * @type {string[]}
     */
    scopeList;
    type = 'acl';

    /**
     * @type {'detail'|'edit'}
     */
    mode = 'detail';
    lowestLevelByDefault = true;
    collaborators = true;
    actionList = ['create', 'read', 'edit', 'delete', 'stream'];
    accessList = ['not-set', 'enabled', 'disabled'];
    fieldLevelList = ['yes', 'no'];
    fieldActionList = ['read', 'edit'];
    levelList = ['yes', 'all', 'team', 'own', 'no'];
    booleanLevelList = ['yes', 'no'];
    booleanActionList = ['create'];
    levelListMap = {
      'recordAllTeamOwnNo': ['all', 'team', 'own', 'no'],
      'recordAllTeamNo': ['all', 'team', 'no'],
      'recordAllOwnNo': ['all', 'own', 'no'],
      'recordAllNo': ['all', 'no'],
      'record': ['all', 'team', 'own', 'no']
    };
    defaultLevels = {
      delete: 'no'
    };
    styleMap = {
      yes: 'success',
      all: 'success',
      account: 'info',
      contact: 'info',
      team: 'info',
      own: 'warning',
      no: 'danger',
      enabled: 'success',
      disabled: 'danger',
      'not-set': 'muted'
    };

    /**
     * @private
     * @type {Object.<Record>}
     */
    scopeLevelMemory;

    /**
     * @private
     * @type {import('model').default}
     */
    formModel;

    /**
     * @private
     * @type {ViewRecordHelper}
     */
    formRecordHelper;

    /**
     * @private
     * @type {Object.<string, EnumFieldView>}
     */
    enumViews;

    /**
     * @private
     * @type {{
     *     data: Object.<string, Record.<string, string>|false>,
     *     fieldData: Object.<string, Object.<string, Record.<string, string>|false>>,
     * }}
     */
    acl;

    /**
     * @private
     * @type {
     *     {
     *         name: string,
     *         list: {
     *             name: string,
     *             list: {
     *                 action: 'read'|'edit',
     *                 value: 'yes'|'no',
     *                 name: string,
     *            }[],
     *          }[],
     *     }[]
     * }
     */
    fieldTableDataList;
    data() {
      const data = {};
      data.styleMap = this.styleMap;
      data.editMode = this.mode === 'edit';
      data.actionList = this.actionList;
      data.accessList = this.accessList;
      data.fieldActionList = this.fieldActionList;
      data.fieldLevelList = this.fieldLevelList;
      data.tableDataList = this.getTableDataList();
      data.fieldTableDataList = this.fieldTableDataList;
      let hasFieldLevelData = false;
      this.fieldTableDataList.forEach(d => {
        if (d.list.length) {
          hasFieldLevelData = true;
        }
      });
      data.hasFieldLevelData = hasFieldLevelData;
      data.hiddenFields = this.formRecordHelper.getHiddenFields();
      return data;
    }
    events = {
      /** @this FieldManagerListView */
      'keyup input[data-name="quick-search"]': function (e) {
        this.processQuickSearch(e.currentTarget.value);
      },
      /** @this RoleRecordTableView */
      'click .action[data-action="addField"]': function (e) {
        const scope = $(e.currentTarget).data().scope;
        this.showAddFieldModal(scope);
      },
      /** @this RoleRecordTableView */
      'click .action[data-action="removeField"]': function (e) {
        const scope = $(e.currentTarget).data().scope;
        const field = $(e.currentTarget).data().field;
        this.removeField(scope, field);
      }
    };

    /**
     * @private
     * @return {({
     *     list: {
     *         level: string|false,
     *         name: string,
     *         action: string,
     *         levelList: string[]|null,
     *     }[],
     *     name: string,
     *     type: 'boolean'|'record',
     *     access: 'not-set'|'enabled'|'disabled',
     * }|false)[]}
     */
    getTableDataList() {
      const aclData = this.acl.data;
      const aclDataList = [];
      let currentModule = null;
      this.scopeList.forEach(scope => {
        const module = this.getMetadata().get(`scopes.${scope}.module`);
        if (currentModule !== module) {
          currentModule = module;
          aclDataList.push(false);
        }
        let access = 'not-set';
        if (this.final) {
          access = 'enabled';
        }
        if (scope in aclData) {
          access = aclData[scope] === false ? 'disabled' : 'enabled';
        }
        const list = [];
        const type = this.aclTypeMap[scope];
        if (this.aclTypeMap[scope] !== 'boolean') {
          this.actionList.forEach(action => {
            /** @type {string[]} */
            const allowedActionList = this.getMetadata().get(`scopes.${scope}.${this.type}ActionList`);
            if (allowedActionList && !allowedActionList.includes(action)) {
              list.push({
                action: action,
                levelList: null,
                level: null
              });
              return;
            }
            if (action === 'stream' && !this.getMetadata().get(`scopes.${scope}.stream`)) {
              list.push({
                action: 'stream',
                levelList: null,
                level: null
              });
              return;
            }
            let level = null;
            const levelList = this.getLevelList(scope, action);
            if (scope in aclData) {
              if (access === 'enabled') {
                if (aclData[scope] !== true) {
                  if (action in aclData[scope]) {
                    level = aclData[scope][action];
                  }
                  if (level === null) {
                    level = levelList[levelList.length - 1];
                  }
                }
              } else {
                level = 'no';
              }
            }
            if (level && !levelList.includes(level)) {
              levelList.push(level);
              levelList.sort((a, b) => {
                return this.levelList.findIndex(it => it === a) - this.levelList.findIndex(it => it === b);
              });
            }
            list.push({
              level: level,
              name: `${scope}-${action}`,
              action: action,
              levelList: levelList
            });
          });
        }
        aclDataList.push({
          list: list,
          access: access,
          name: scope,
          type: type
        });
      });
      return aclDataList;
    }

    /**
     * @private
     * @param {string} scope
     * @param {'create'|'read'|'edit'|'delete'|'stream'} action
     * @return {string[]}
     */
    getLevelList(scope, action) {
      if (this.booleanActionList.includes(action)) {
        return this.booleanLevelList;
      }
      const specifiedLevelList = this.getMetadata().get(`scopes.${scope}.${this.type}ActionLevelListMap.${action}`) || this.getMetadata().get(`scopes.${scope}.${this.type}LevelList`);
      if (specifiedLevelList) {
        return specifiedLevelList;
      }
      const type = this.aclTypeMap[scope];
      return this.levelListMap[type] || [];
    }
    setup() {
      this.mode = this.options.mode || 'detail';
      this.final = this.options.final || false;
      this.scopeLevelMemory = {};
      this.setupData();
      this.setupFormModel();
      this.listenTo(this.model, 'change:data change:fieldData', async () => {
        this.setupData();
        await this.setupFormModel();
        if (this.isRendered()) {
          await this.reRenderPreserveSearch();
        }
      });
      this.listenTo(this.model, 'sync', async () => {
        this.setupData();
        await this.setupFormModel();
        if (this.isRendered()) {
          await this.reRenderPreserveSearch();
        }
      });
      this.template = 'role/table';
      if (this.mode === 'edit') {
        this.template = 'role/table-edit';
      }
      this.once('remove', () => {
        $(window).off('scroll.scope-' + this.cid);
        $(window).off('resize.scope-' + this.cid);
        $(window).off('scroll.field-' + this.cid);
        $(window).off('resize.field-' + this.cid);
      });
    }

    /**
     * @private
     */
    async setupFormModel() {
      const defs = {
        fields: {}
      };
      this.formModel = new _model.default({}, {
        defs: defs
      });
      this.formRecordHelper = new _viewRecordHelper.default();
      this.enumViews = {};
      const promises = [];
      this.getTableDataList().forEach(scopeItem => {
        if (!scopeItem) {
          return;
        }
        const scope = scopeItem.name;
        defs.fields[scope] = {
          type: 'enum',
          options: ['not-set', 'enabled', 'disabled'],
          translation: 'Role.options.accessList',
          style: this.styleMap
        };
        this.formModel.set(scope, scopeItem.access, {
          silent: true
        });
        const view = new _enum.default({
          name: scope,
          model: this.formModel,
          mode: this.mode,
          inlineEditDisabled: true,
          recordHelper: this.formRecordHelper
        });
        promises.push(this.assignView(scope, view, `td[data-name="${scope}"]`));
        if (!scopeItem.list) {
          return;
        }
        this.listenTo(this.formModel, `change:${scope}`, () => this.onSelectAccess(scope));
        scopeItem.list.forEach(actionItem => {
          if (!actionItem.levelList) {
            return;
          }
          const name = actionItem.name;
          defs.fields[name] = {
            type: 'enum',
            options: actionItem.levelList,
            translation: 'Role.options.levelList',
            style: this.styleMap
          };
          this.formModel.set(name, actionItem.level, {
            silent: true
          });
          const view = new _enum.default({
            name: name,
            model: this.formModel,
            mode: this.mode,
            inlineEditDisabled: true,
            recordHelper: this.formRecordHelper
          });
          this.enumViews[name] = view;
          promises.push(this.assignView(name, view, `div[data-name="${name}"]`));
          this.formRecordHelper.setFieldStateParam(name, 'hidden', scopeItem.access !== 'enabled');
          if (actionItem.action === 'read') {
            this.listenTo(this.formModel, `change:${scope}-read`, (m, value) => {
              ['edit', 'delete', 'stream'].forEach(action => this.controlSelect(scope, action, value));
            });
          }
          if (actionItem.action === 'edit') {
            this.listenTo(this.formModel, `change:${scope}-edit`, (m, value) => {
              this.controlSelect(scope, 'delete', value);
            });
          }
        });
        const readLevel = this.formModel.attributes[`${scope}-read`];
        const editLevel = this.formModel.attributes[`${scope}-edit`];
        if (readLevel) {
          this.controlSelect(scope, 'edit', readLevel, true);
          this.controlSelect(scope, 'stream', readLevel, true);
          if (!editLevel) {
            this.controlSelect(scope, 'delete', readLevel, true);
          }
        }
        if (editLevel) {
          this.controlSelect(scope, 'delete', editLevel, true);
        }
      });
      this.fieldTableDataList.forEach(scopeItem => {
        scopeItem.list.forEach(fieldItem => this.setupFormField(scopeItem.name, fieldItem));
      });
      return Promise.all(promises);
    }

    /**
     * @private
     * @param {string} scope
     * @param {{
     *     name: string,
     *     list: {
     *         action: 'read'|'edit',
     *         value: 'yes'|'no',
     *         name: string,
     *     }[],
     * }} fieldItem
     */
    async setupFormField(scope, fieldItem) {
      const promises = [];
      const field = fieldItem.name;
      const defs = this.formModel.defs;
      fieldItem.list.forEach(actionItem => {
        const name = actionItem.name;
        defs.fields[name] = {
          type: 'enum',
          options: ['yes', 'no'],
          translation: 'Role.options.levelList',
          style: this.styleMap
        };
        this.formModel.set(name, actionItem.value, {
          silent: true
        });
        const view = new _enum.default({
          name: name,
          model: this.formModel,
          mode: this.mode,
          inlineEditDisabled: true,
          recordHelper: this.formRecordHelper
        });
        this.enumViews[name] = view;
        promises.push(this.assignView(name, view, `div[data-name="${name}"]`));
        if (actionItem.action === 'read') {
          this.listenTo(this.formModel, `change:${scope}-${field}-read`, (m, value) => {
            this.controlFieldEditSelect(scope, field, value, true);
          });
        }
      });
      if (fieldItem.list.length) {
        const readLevel = this.formModel.attributes[`${scope}-${field}-read`];
        if (readLevel) {
          this.controlFieldEditSelect(scope, field, readLevel);
        }
      }
      await Promise.all(promises);
    }

    /**
     * @private
     */
    setupData() {
      this.acl = {};
      if (this.options.acl) {
        this.acl.data = this.options.acl.data;
      } else {
        this.acl.data = Espo.Utils.cloneDeep(this.model.attributes.data || {});
      }
      if (this.options.acl) {
        this.acl.fieldData = this.options.acl.fieldData;
      } else {
        this.acl.fieldData = Espo.Utils.cloneDeep(this.model.attributes.fieldData || {});
      }
      this.setupScopeList();
      this.setupFieldTableDataList();
    }

    /**
     * @private
     * @return {string[]} scopeList
     */
    getSortedScopeList() {
      const moduleList = [null, 'Crm'];
      const scopes = /** @type {Object.<{module: string}>} */this.getMetadata().get('scopes');
      Object.keys(scopes).forEach(scope => {
        const module = scopes[scope].module;
        if (!module || module === 'Custom' || moduleList.includes(module)) {
          return;
        }
        moduleList.push(module);
      });
      moduleList.push('Custom');
      return Object.keys(scopes).sort((v1, v2) => {
        const module1 = scopes[v1].module || null;
        const module2 = scopes[v2].module || null;
        if (module1 !== module2) {
          const index1 = moduleList.findIndex(m => m === module1);
          const index2 = moduleList.findIndex(m => m === module2);
          return index1 - index2;
        }
        return this.translate(v1, 'scopeNamesPlural').localeCompare(this.translate(v2, 'scopeNamesPlural'));
      });
    }

    /**
     * @private
     */
    setupScopeList() {
      this.aclTypeMap = {};
      this.scopeList = [];
      this.getSortedScopeList().forEach(scope => {
        if (this.getMetadata().get(`scopes.${scope}.disabled`)) {
          return;
        }
        const acl = this.getMetadata().get(`scopes.${scope}.acl`);
        if (acl) {
          this.scopeList.push(scope);
          this.aclTypeMap[scope] = acl;
          if (acl === true) {
            this.aclTypeMap[scope] = 'record';
          }
        }
      });
    }

    /**
     * @private
     */
    setupFieldTableDataList() {
      this.fieldTableDataList = [];
      this.scopeList.forEach(scope => {
        const defs = /** @type {Record} */this.getMetadata().get(`scopes.${scope}`) || {};
        if (!defs.entity || defs.aclFieldLevelDisabled) {
          return;
        }
        if (this.isAclFieldLevelDisabledForScope(scope)) {
          return;
        }
        if (!(scope in this.acl.fieldData)) {
          if (this.mode === 'edit') {
            this.fieldTableDataList.push({
              name: scope,
              list: []
            });
            return;
          }
          return;
        }
        const scopeData = this.acl.fieldData[scope];
        const fieldList = this.getFieldManager().getEntityTypeFieldList(scope);
        this.getLanguage().sortFieldList(scope, fieldList);
        const fieldDataList = [];
        fieldList.forEach(field => {
          if (!(field in scopeData)) {
            return;
          }
          const list = [];
          this.fieldActionList.forEach(action => {
            list.push({
              name: `${scope}-${field}-${action}`,
              action: action,
              value: scopeData[field][action] || 'yes'
            });
          });
          if (this.mode === 'detail' && !list.length) {
            return;
          }
          fieldDataList.push({
            name: field,
            list: list
          });
        });
        this.fieldTableDataList.push({
          name: scope,
          list: fieldDataList
        });
      });
    }

    /**
     * @private
     * @param {string} scope
     * @return {boolean}
     */
    isAclFieldLevelDisabledForScope(scope) {
      return !!this.getMetadata().get(`scopes.${scope}.aclFieldLevelDisabled`);
    }

    /**
     * @private
     * @param {string} [onlyScope]
     * @return {Object.<string, Object.<string, string>|false|true>}
     */
    fetchScopeData(onlyScope) {
      const data = {};
      const scopeList = this.scopeList;
      const actionList = this.actionList;
      const aclTypeMap = this.aclTypeMap;
      for (const scope of scopeList) {
        if (onlyScope && scope !== onlyScope) {
          continue;
        }
        const value = this.formModel.attributes[scope] || 'not-set';
        if (!onlyScope && value === 'not-set') {
          continue;
        }
        if (!onlyScope && value === 'disabled') {
          data[scope] = false;
          continue;
        }
        let scopeData = true;
        if (aclTypeMap[scope] !== 'boolean') {
          scopeData = {};
          for (const j in actionList) {
            const action = actionList[j];
            const value = this.formModel.attributes[`${scope}-${action}`];
            if (value === undefined) {
              continue;
            }
            scopeData[action] = value;
          }
        }
        data[scope] = scopeData;
      }
      return data;
    }

    /**
     * @private
     * @return {Object.<string, Object.<string, Record.<string, string>|false>>}
     */
    fetchFieldData() {
      const data = {};
      this.fieldTableDataList.forEach(scopeData => {
        const scopeValueData = {};
        const scope = scopeData.name;
        scopeData.list.forEach(fieldData => {
          const field = fieldData.name;
          const fieldValueData = {};
          this.fieldActionList.forEach(action => {
            const name = `${scope}-${fieldData.name}-${action}`;
            const value = this.formModel.attributes[name];
            if (value === undefined) {
              return;
            }
            fieldValueData[action] = value;
          });
          scopeValueData[field] = fieldValueData;
        });
        data[scope] = scopeValueData;
      });
      return data;
    }
    afterRender() {
      this.$quickSearch = this.$el.find('input[data-name="quick-search"]');
      if (this.mode === 'edit' || this.mode === 'detail') {
        this.initStickyHeader('scope');
        this.initStickyHeader('field');
      }
    }

    /**
     * @private
     * @param {string} scope
     * @param {string} field
     * @param {string} limitValue
     * @param {boolean} [dontChange]
     */
    controlFieldEditSelect(scope, field, limitValue, dontChange) {
      const attribute = `${scope}-${field}-edit`;
      let value = this.formModel.attributes[attribute];
      if (!dontChange && this.levelList.indexOf(value) < this.levelList.indexOf(limitValue)) {
        value = limitValue;
      }
      const options = this.fieldLevelList.filter(item => this.levelList.indexOf(item) >= this.levelList.indexOf(limitValue));
      if (!dontChange) {
        this.formModel.set(attribute, value);
      }
      this.formRecordHelper.setFieldOptionList(attribute, options);
      const view = this.enumViews[attribute];
      if (view) {
        view.setOptionList(options);
      }
    }

    /**
     * @private
     * @param {string} scope
     * @param {string} action
     * @param {string} limitValue
     * @param {boolean} [dontChange]
     */
    controlSelect(scope, action, limitValue, dontChange) {
      const attribute = `${scope}-${action}`;
      let value = this.formModel.attributes[attribute];
      if (!dontChange && this.levelList.indexOf(value) < this.levelList.indexOf(limitValue)) {
        value = limitValue;
      }
      const options = this.getLevelList(scope, action).filter(item => this.levelList.indexOf(item) >= this.levelList.indexOf(limitValue));
      if (!dontChange) {
        setTimeout(() => this.formModel.set(attribute, value), 0);
      }
      this.formRecordHelper.setFieldOptionList(attribute, options);
      const view = this.enumViews[attribute];
      if (view) {
        view.setOptionList(options);
      }
    }

    /**
     * @private
     * @param {string} scope
     */
    showAddFieldModal(scope) {
      const ignoreFieldList = Object.keys(this.acl.fieldData[scope] || {});
      this.createView('dialog', 'views/role/modals/add-field', {
        scope: scope,
        ignoreFieldList: ignoreFieldList,
        type: this.type
      }, /** import('views/role/modals/add-field').default */view => {
        view.render();
        this.listenTo(view, 'add-fields', async (/** string[] */fields) => {
          view.close();
          const scopeData = this.fieldTableDataList.find(it => it.name === scope);
          if (!scopeData) {
            return;
          }
          const promises = [];
          fields.filter(field => !scopeData.list.find(it => it.name === field)).forEach(field => {
            const item = {
              name: field,
              list: [{
                name: `${scope}-${field}-read`,
                action: 'read',
                value: 'no'
              }, {
                name: `${scope}-${field}-edit`,
                action: 'edit',
                value: 'no'
              }]
            };
            scopeData.list.unshift(item);
            promises.push(this.setupFormField(scope, item));
          });
          await Promise.all(promises);
          await this.reRenderPreserveSearch();
        });
      });
    }

    /**
     * @private
     * @param {string} scope
     * @param {string} field
     */
    async removeField(scope, field) {
      const attributeRead = `${scope}-${field}-read`;
      const attributeEdit = `${scope}-${field}-edit`;
      delete this.enumViews[attributeRead];
      delete this.enumViews[attributeEdit];
      this.clearView(attributeRead);
      this.clearView(attributeEdit);
      this.formModel.unset(attributeRead);
      this.formModel.unset(attributeEdit);
      delete this.formModel.defs.fields[attributeRead];
      delete this.formModel.defs.fields[attributeEdit];
      const scopeData = this.fieldTableDataList.find(it => it.name === scope);
      if (!scopeData) {
        return;
      }
      const index = scopeData.list.findIndex(it => it.name === field);
      if (index === -1) {
        return;
      }
      scopeData.list.splice(index, 1);
      await this.reRenderPreserveSearch();
      this.trigger('change');
    }

    /**
     * @private
     */
    async reRenderPreserveSearch() {
      const searchText = this.$quickSearch.val();
      await this.reRender();
      this.$quickSearch.val(searchText);
      this.processQuickSearch(searchText);
    }

    /**
     * @private
     * @param {string} type
     */
    initStickyHeader(type) {
      const $sticky = this.$el.find(`.sticky-header-${type}`);
      const $window = $(window);
      const screenWidthXs = this.getThemeManager().getParam('screenWidthXs');
      const $buttonContainer = $('.detail-button-container');
      const $table = this.$el.find(`table.${type}-level`);
      if (!$table.length) {
        return;
      }
      if (!$buttonContainer.length) {
        return;
      }
      const navbarHeight = this.getThemeManager().getParam('navbarHeight') * this.getThemeManager().getFontSizeFactor();
      const handle = () => {
        if ($(window.document).width() < screenWidthXs) {
          $sticky.addClass('hidden');
          return;
        }
        const stickTopPosition = $buttonContainer.get(0).getBoundingClientRect().top + $buttonContainer.outerHeight();
        let topEdge = $table.position().top;
        topEdge -= $buttonContainer.height();
        topEdge += $table.find('tr > th').height();
        topEdge -= navbarHeight;
        const bottomEdge = topEdge + $table.outerHeight(true) - $buttonContainer.height();
        const scrollTop = $window.scrollTop();
        const width = $table.width();
        if (scrollTop > topEdge && scrollTop < bottomEdge) {
          $sticky.css({
            position: 'fixed',
            marginTop: stickTopPosition + 'px',
            top: 0,
            width: width + 'px',
            marginLeft: '1px'
          });
          $sticky.removeClass('hidden');
        } else {
          $sticky.addClass('hidden');
        }
      };
      $window.off('scroll.' + type + '-' + this.cid);
      $window.on('scroll.' + type + '-' + this.cid, handle);
      $window.off('resize.' + type + '-' + this.cid);
      $window.on('resize.' + type + '-' + this.cid, handle);
      handle();
    }

    /**
     * @private
     * @param {string} scope
     * @param {string} action
     * @return {EnumFieldView}
     */
    getScopeActionView(scope, action) {
      return this.getView(`${scope}-${action}`);
    }

    /**
     * @private
     * @param {string} scope
     */
    hideScopeActions(scope) {
      this.actionList.forEach(action => {
        const view = this.getScopeActionView(scope, action);
        if (!view) {
          return;
        }
        view.hide();
        const name = `${scope}-${action}`;
        this.formRecordHelper.setFieldStateParam(name, 'hidden', true);
      });
    }

    /**
     * @private
     * @param {string} scope
     */
    showScopeActions(scope) {
      this.actionList.forEach(action => {
        const view = this.getScopeActionView(scope, action);
        if (!view) {
          return;
        }
        view.show();
        const name = `${scope}-${action}`;
        this.formRecordHelper.setFieldStateParam(name, 'hidden', false);
      });
    }

    /**
     * @private
     * @param {string} scope
     */
    onSelectAccess(scope) {
      const value = this.formModel.attributes[scope];
      if (value !== 'enabled') {
        const fetchedData = this.fetchScopeData(scope);
        this.hideScopeActions(scope);
        delete this.scopeLevelMemory[scope];
        if (scope in fetchedData) {
          this.scopeLevelMemory[scope] = fetchedData[scope] || {};
        }
        return;
      }
      this.showScopeActions(scope);
      const attributes = {};
      this.actionList.forEach(action => {
        const memoryData = this.scopeLevelMemory[scope] || {};
        const levelInMemory = memoryData[action];
        let level = levelInMemory || this.defaultLevels[action];
        if (!level) {
          level = this.getLevelList(scope, action)[0];
        }
        if (!levelInMemory && this.lowestLevelByDefault) {
          level = [...this.getLevelList(scope, action)].pop();
        }
        attributes[`${scope}-${action}`] = level;
      });

      // Need a timeout as it's processed within a change callback.
      setTimeout(() => this.formModel.set(attributes), 0);
    }

    /**
     * @private
     * @param {string} text
     */
    processQuickSearch(text) {
      text = text.trim();
      if (!text) {
        this.$el.find('table tr.item-row').removeClass('hidden');
        return;
      }
      const matchedList = [];
      const lowerCaseText = text.toLowerCase();
      this.scopeList.forEach(item => {
        let matched = false;
        const translation = this.getLanguage().translate(item, 'scopeNamesPlural');
        if (translation.toLowerCase().indexOf(lowerCaseText) === 0 || item.toLowerCase().indexOf(lowerCaseText) === 0) {
          matched = true;
        }
        if (!matched) {
          const wordList = translation.split(' ').concat(translation.split(' '));
          wordList.forEach(word => {
            if (word.toLowerCase().indexOf(lowerCaseText) === 0) {
              matched = true;
            }
          });
        }
        if (matched) {
          matchedList.push(item);
        }
      });
      if (matchedList.length === 0) {
        this.$el.find('table tr.item-row').addClass('hidden');
        return;
      }
      this.$el.find('table tr.item-row[data-name="_"]').addClass('hidden');
      this.scopeList.forEach(/** string */item => {
        const $row = this.$el.find(`table tr.item-row[data-name="${item}"]`);
        if (!matchedList.includes(item)) {
          $row.addClass('hidden');
          return;
        }
        $row.removeClass('hidden');
      });
    }
  }
  var _default = _exports.default = RoleRecordTableView;
});

define("views/role/record/list", ["exports", "views/record/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    quickDetailDisabled = true;
    quickEditDisabled = true;
    massActionList = ['remove', 'export'];
    checkAllResultDisabled = true;
  }
  _exports.default = _default;
});

define("views/role/record/edit", ["exports", "views/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class RoleEditRecordView extends _edit.default {
    tableView = 'views/role/record/table';
    sideView = false;
    isWide = true;
    stickButtonsContainerAllTheWay = true;
    fetch() {
      const data = super.fetch();
      data['data'] = {};
      const scopeList = this.getTableView().scopeList;
      const actionList = this.getTableView().actionList;
      const aclTypeMap = this.getTableView().aclTypeMap;
      for (const i in scopeList) {
        const scope = scopeList[i];
        if (this.$el.find('select[name="' + scope + '"]').val() === 'not-set') {
          continue;
        }
        if (this.$el.find('select[name="' + scope + '"]').val() === 'disabled') {
          data['data'][scope] = false;
          continue;
        }
        let o = true;
        if (aclTypeMap[scope] !== 'boolean') {
          o = {};
          for (const j in actionList) {
            const action = actionList[j];
            o[action] = this.$el.find('select[name="' + scope + '-' + action + '"]').val();
          }
        }
        data['data'][scope] = o;
      }
      data['data'] = this.getTableView().fetchScopeData();
      data['fieldData'] = this.getTableView().fetchFieldData();
      return data;
    }
    setup() {
      super.setup();
      this.createView('extra', this.tableView, {
        mode: 'edit',
        selector: '.extra',
        model: this.model
      }, view => {
        this.listenTo(view, 'change', () => {
          const data = this.fetch();
          this.model.set(data);
        });
      });
    }

    /**
     * @return {import('./table').default}
     */
    getTableView() {
      return this.getView('extra');
    }
  }
  var _default = _exports.default = RoleEditRecordView;
});

define("views/role/record/detail", ["exports", "views/record/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class RoleDetailRecordView extends _detail.default {
    tableView = 'views/role/record/table';
    sideView = false;
    isWide = true;
    editModeDisabled = true;
    stickButtonsContainerAllTheWay = true;
    setup() {
      super.setup();
      this.createView('extra', this.tableView, {
        selector: '.extra',
        model: this.model
      });
    }
  }
  _exports.default = RoleDetailRecordView;
});

define("views/inbound-email/record/detail", ["exports", "views/record/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    setup() {
      super.setup();
      this.setupFieldsBehaviour();
      this.initSslFieldListening();
    }
    modifyDetailLayout(layout) {
      layout.filter(panel => panel.tabLabel === '$label:SMTP').forEach(panel => {
        panel.rows.forEach(row => {
          row.forEach(item => {
            const labelText = this.translate(item.name, 'fields', 'InboundEmail');
            if (labelText && labelText.indexOf('SMTP ') === 0) {
              item.labelText = Espo.Utils.upperCaseFirst(labelText.substring(5));
            }
          });
        });
      });
    }
    wasFetched() {
      if (!this.model.isNew()) {
        return !!(this.model.get('fetchData') || {}).lastUID;
      }
      return false;
    }
    initSmtpFieldsControl() {
      this.controlSmtpFields();
      this.controlSentFolderField();
      this.listenTo(this.model, 'change:useSmtp', this.controlSmtpFields, this);
      this.listenTo(this.model, 'change:smtpAuth', this.controlSmtpFields, this);
      this.listenTo(this.model, 'change:storeSentEmails', this.controlSentFolderField, this);
    }
    controlSmtpFields() {
      if (this.model.get('useSmtp')) {
        this.showField('smtpHost');
        this.showField('smtpPort');
        this.showField('smtpAuth');
        this.showField('smtpSecurity');
        this.showField('smtpTestSend');
        this.showField('fromName');
        this.showField('smtpIsShared');
        this.showField('smtpIsForMassEmail');
        this.showField('storeSentEmails');
        this.setFieldRequired('smtpHost');
        this.setFieldRequired('smtpPort');
        this.controlSmtpAuthField();
        return;
      }
      this.hideField('smtpHost');
      this.hideField('smtpPort');
      this.hideField('smtpAuth');
      this.hideField('smtpUsername');
      this.hideField('smtpPassword');
      this.hideField('smtpAuthMechanism');
      this.hideField('smtpSecurity');
      this.hideField('smtpTestSend');
      this.hideField('fromName');
      this.hideField('smtpIsShared');
      this.hideField('smtpIsForMassEmail');
      this.hideField('storeSentEmails');
      this.hideField('sentFolder');
      this.setFieldNotRequired('smtpHost');
      this.setFieldNotRequired('smtpPort');
      this.setFieldNotRequired('smtpUsername');
    }
    controlSentFolderField() {
      if (this.model.get('useSmtp') && this.model.get('storeSentEmails')) {
        this.showField('sentFolder');
        this.setFieldRequired('sentFolder');
        return;
      }
      this.hideField('sentFolder');
      this.setFieldNotRequired('sentFolder');
    }
    controlSmtpAuthField() {
      if (this.model.get('smtpAuth')) {
        this.showField('smtpUsername');
        this.showField('smtpPassword');
        this.showField('smtpAuthMechanism');
        this.setFieldRequired('smtpUsername');
        return;
      }
      this.hideField('smtpUsername');
      this.hideField('smtpPassword');
      this.hideField('smtpAuthMechanism');
      this.setFieldNotRequired('smtpUsername');
    }
    controlStatusField() {
      const list = ['username', 'port', 'host', 'monitoredFolders'];
      if (this.model.get('status') === 'Active' && this.model.get('useImap')) {
        list.forEach(item => {
          this.setFieldRequired(item);
        });
        return;
      }
      list.forEach(item => {
        this.setFieldNotRequired(item);
      });
    }
    setupFieldsBehaviour() {
      this.controlStatusField();
      this.listenTo(this.model, 'change:status', (model, value, o) => {
        if (o.ui) {
          this.controlStatusField();
        }
      });
      this.listenTo(this.model, 'change:useImap', (model, value, o) => {
        if (o.ui) {
          this.controlStatusField();
        }
      });
      if (this.wasFetched()) {
        this.setFieldReadOnly('fetchSince');
      } else {
        this.setFieldNotReadOnly('fetchSince');
      }
      this.initSmtpFieldsControl();
      const handleRequirement = model => {
        if (model.get('createCase')) {
          this.showField('caseDistribution');
        } else {
          this.hideField('caseDistribution');
        }
        if (model.get('createCase') && ['Round-Robin', 'Least-Busy'].indexOf(model.get('caseDistribution')) !== -1) {
          this.setFieldRequired('team');
          this.showField('targetUserPosition');
        } else {
          this.setFieldNotRequired('team');
          this.hideField('targetUserPosition');
        }
        if (model.get('createCase') && 'Direct-Assignment' === model.get('caseDistribution')) {
          this.setFieldRequired('assignToUser');
          this.showField('assignToUser');
        } else {
          this.setFieldNotRequired('assignToUser');
          this.hideField('assignToUser');
        }
        if (model.get('createCase') && model.get('createCase') !== '') {
          this.showField('team');
        } else {
          this.hideField('team');
        }
      };
      this.listenTo(this.model, 'change:createCase', (model, value, o) => {
        handleRequirement(model);
        if (!o.ui) {
          return;
        }
        if (!model.get('createCase')) {
          this.model.set({
            caseDistribution: '',
            teamId: null,
            teamName: null,
            assignToUserId: null,
            assignToUserName: null,
            targetUserPosition: ''
          });
        }
      });
      handleRequirement(this.model);
      this.listenTo(this.model, 'change:caseDistribution', (model, value, o) => {
        handleRequirement(model);
        if (!o.ui) {
          return;
        }
        setTimeout(() => {
          if (!this.model.get('caseDistribution')) {
            this.model.set({
              assignToUserId: null,
              assignToUserName: null,
              targetUserPosition: ''
            });
            return;
          }
          if (this.model.get('caseDistribution') === 'Direct-Assignment') {
            this.model.set({
              targetUserPosition: ''
            });
          }
          this.model.set({
            assignToUserId: null,
            assignToUserName: null
          });
        }, 10);
      });
    }
    initSslFieldListening() {
      this.listenTo(this.model, 'change:security', (model, value, o) => {
        if (!o.ui) {
          return;
        }
        if (value) {
          this.model.set('port', 993);
        } else {
          this.model.set('port', 143);
        }
      });
      this.listenTo(this.model, 'change:smtpSecurity', (model, value, o) => {
        if (!o.ui) {
          return;
        }
        if (value === 'SSL') {
          this.model.set('smtpPort', 465);
        } else if (value === 'TLS') {
          this.model.set('smtpPort', 587);
        } else {
          this.model.set('smtpPort', 25);
        }
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/index", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class AdminIndexView extends _view.default {
    template = 'admin/index';
    events = {
      /** @this AdminIndexView */
      'click [data-action]': function (e) {
        Espo.Utils.handleAction(this, e.originalEvent, e.currentTarget);
      },
      /** @this AdminIndexView */
      'keyup input[data-name="quick-search"]': function (e) {
        this.processQuickSearch(e.currentTarget.value);
      }
    };
    data() {
      return {
        panelDataList: this.panelDataList,
        iframeUrl: this.iframeUrl,
        iframeHeight: this.getConfig().get('adminPanelIframeHeight') || 1330,
        iframeDisabled: this.getConfig().get('adminPanelIframeDisabled') || false
      };
    }
    afterRender() {
      const $quickSearch = this.$el.find('input[data-name="quick-search"]');
      if (this.quickSearchText) {
        $quickSearch.val(this.quickSearchText);
        this.processQuickSearch(this.quickSearchText);
      }

      // noinspection JSUnresolvedReference
      $quickSearch.get(0).focus({
        preventScroll: true
      });
    }
    setup() {
      this.panelDataList = [];
      const panels = this.getMetadata().get('app.adminPanel') || {};
      for (const name in panels) {
        const panelItem = Espo.Utils.cloneDeep(panels[name]);
        panelItem.name = name;
        panelItem.itemList = panelItem.itemList || [];
        panelItem.label = this.translate(panelItem.label, 'labels', 'Admin');
        if (panelItem.itemList) {
          panelItem.itemList.forEach(item => {
            item.label = this.translate(item.label, 'labels', 'Admin');
            if (item.description) {
              item.keywords = (this.getLanguage().get('Admin', 'keywords', item.description) || '').split(',');
              item.keywords = item.keywords.map(keyword => keyword.trim().toLowerCase());
            } else {
              item.keywords = [];
            }
          });
        }

        // Legacy support.
        if (panelItem.items) {
          panelItem.items.forEach(item => {
            item.label = this.translate(item.label, 'labels', 'Admin');
            panelItem.itemList.push(item);
            item.keywords = [];
          });
        }
        this.panelDataList.push(panelItem);
      }
      this.panelDataList.sort((v1, v2) => {
        if (!('order' in v1) && 'order' in v2) {
          return 0;
        }
        if (!('order' in v2)) {
          return 0;
        }
        return v1.order - v2.order;
      });
      const iframeParams = ['version=' + encodeURIComponent(this.getConfig().get('version')), 'css=' + encodeURIComponent(this.getConfig().get('siteUrl') + '/' + this.getThemeManager().getStylesheet())];
      this.iframeUrl = this.getConfig().get('adminPanelIframeUrl') || 'https://s.espocrm.com/';
      if (~this.iframeUrl.indexOf('?')) {
        this.iframeUrl += '&' + iframeParams.join('&');
      } else {
        this.iframeUrl += '?' + iframeParams.join('&');
      }
      if (!this.getConfig().get('adminNotificationsDisabled')) {
        this.createView('notificationsPanel', 'views/admin/panels/notifications', {
          selector: '.notifications-panel-container'
        });
      }
    }
    processQuickSearch(text) {
      text = text.trim();
      this.quickSearchText = text;
      const $noData = this.$noData || this.$el.find('.no-data');
      $noData.addClass('hidden');
      if (!text) {
        this.$el.find('.admin-content-section').removeClass('hidden');
        this.$el.find('.admin-content-row').removeClass('hidden');
        return;
      }
      text = text.toLowerCase();
      this.$el.find('.admin-content-section').addClass('hidden');
      this.$el.find('.admin-content-row').addClass('hidden');
      let anythingMatched = false;
      this.panelDataList.forEach((panel, panelIndex) => {
        let panelMatched = false;
        let panelLabelMatched = false;
        if (panel.label && panel.label.toLowerCase().indexOf(text) === 0) {
          panelMatched = true;
          panelLabelMatched = true;
        }
        panel.itemList.forEach((row, rowIndex) => {
          if (!row.label) {
            return;
          }
          let matched = false;
          if (panelLabelMatched) {
            matched = true;
          }
          if (!matched) {
            matched = row.label.toLowerCase().indexOf(text) === 0;
          }
          if (!matched) {
            const wordList = row.label.split(' ');
            wordList.forEach(word => {
              if (word.toLowerCase().indexOf(text) === 0) {
                matched = true;
              }
            });
            if (!matched) {
              matched = ~row.keywords.indexOf(text);
            }
            if (!matched) {
              if (text.length >= 3) {
                row.keywords.forEach(word => {
                  if (word.indexOf(text) === 0) {
                    matched = true;
                  }
                });
              }
            }
          }
          if (matched) {
            panelMatched = true;
            this.$el.find('.admin-content-section[data-index="' + panelIndex.toString() + '"] ' + '.admin-content-row[data-index="' + rowIndex.toString() + '"]').removeClass('hidden');
            anythingMatched = true;
          }
        });
        if (panelMatched) {
          this.$el.find('.admin-content-section[data-index="' + panelIndex.toString() + '"]').removeClass('hidden');
          anythingMatched = true;
        }
      });
      if (!anythingMatched) {
        $noData.removeClass('hidden');
      }
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Administration'));
    }

    // noinspection JSUnusedGlobalSymbols
    actionClearCache() {
      this.trigger('clear-cache');
    }

    // noinspection JSUnusedGlobalSymbols
    actionRebuild() {
      this.trigger('rebuild');
    }
  }
  var _default = _exports.default = AdminIndexView;
});

define("views/admin/link-manager/index", ["exports", "view", "views/admin/link-manager/modals/edit-params"], function (_exports, _view, _editParams) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _editParams = _interopRequireDefault(_editParams);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  /** @module views/admin/link-manager/index */

  class LinkManagerIndexView extends _view.default {
    template = 'admin/link-manager/index';

    /**
     * @type {string}
     */
    scope;
    data() {
      return {
        linkDataList: this.linkDataList,
        scope: this.scope,
        isCreatable: this.isCustomizable
      };
    }
    events = {
      /** @this LinkManagerIndexView */
      'click a[data-action="editLink"]': function (e) {
        const link = $(e.currentTarget).data('link');
        this.editLink(link);
      },
      /** @this LinkManagerIndexView */
      'click button[data-action="createLink"]': function () {
        this.createLink();
      },
      /** @this LinkManagerIndexView */
      'click [data-action="removeLink"]': function (e) {
        const link = $(e.currentTarget).data('link');
        const msg = this.translate('confirmRemoveLink', 'messages', 'EntityManager').replace('{link}', link);
        this.confirm(msg, () => {
          this.removeLink(link);
        });
      },
      /** @this LinkManagerIndexView */
      'keyup input[data-name="quick-search"]': function (e) {
        this.processQuickSearch(e.currentTarget.value);
      }
    };

    /**
     *
     * @param {string} type
     * @param {string} foreignType
     * @return {undefined|string}
     */
    computeRelationshipType(type, foreignType) {
      if (type === 'hasMany') {
        if (foreignType === 'hasMany') {
          return 'manyToMany';
        }
        if (foreignType === 'belongsTo') {
          return 'oneToMany';
        }
        return undefined;
      }
      if (type === 'belongsTo') {
        if (foreignType === 'hasMany') {
          return 'manyToOne';
        }
        if (foreignType === 'hasOne') {
          return 'oneToOneRight';
        }
        return undefined;
      }
      if (type === 'belongsToParent') {
        if (foreignType === 'hasChildren') {
          return 'childrenToParent';
        }
        return undefined;
      }
      if (type === 'hasChildren') {
        if (foreignType === 'belongsToParent') {
          return 'parentToChildren';
        }
        return undefined;
      }
      if (type === 'hasOne') {
        if (foreignType === 'belongsTo') {
          return 'oneToOneLeft';
        }
        return undefined;
      }
    }
    setupLinkData() {
      this.linkDataList = [];
      this.isCustomizable = !!this.getMetadata().get(`scopes.${this.scope}.customizable`) && this.getMetadata().get(`scopes.${this.scope}.entityManager.relationships`) !== false;
      const links = /** @type {Object.<string, Record>} */
      this.getMetadata().get(`entityDefs.${this.scope}.links`);
      const linkList = Object.keys(links).sort((v1, v2) => {
        return v1.localeCompare(v2);
      });
      linkList.forEach(link => {
        const defs = links[link];
        let type;
        let isEditable = this.isCustomizable;
        if (defs.type === 'belongsToParent') {
          type = 'childrenToParent';
        } else {
          if (!defs.entity) {
            return;
          }
          if (defs.foreign) {
            const foreignType = this.getMetadata().get(`entityDefs.${defs.entity}.links.${defs.foreign}.type`);
            type = this.computeRelationshipType(defs.type, foreignType);
          } else {
            isEditable = false;
            if (defs.relationName) {
              type = 'manyToMany';
            } else if (defs.type === 'belongsTo') {
              type = 'manyToOne';
            }
          }
        }
        const labelEntityForeign = defs.entity ? this.getLanguage().translate(defs.entity, 'scopeNames') : undefined;
        const isRemovable = defs.isCustom;
        const hasEditParams = defs.type === 'hasMany' || defs.type === 'hasChildren';
        this.linkDataList.push({
          link: link,
          isCustom: defs.isCustom,
          isRemovable: isRemovable,
          customizable: defs.customizable,
          isEditable: isEditable,
          hasDropdown: isEditable || isRemovable || hasEditParams,
          hasEditParams: hasEditParams,
          type: type,
          entityForeign: defs.entity,
          entity: this.scope,
          labelEntityForeign: labelEntityForeign,
          linkForeign: defs.foreign,
          label: this.getLanguage().translate(link, 'links', this.scope),
          labelForeign: this.getLanguage().translate(defs.foreign, 'links', defs.entity)
        });
      });
    }
    setup() {
      this.addActionHandler('editParams', (e, target) => this.actionEditParams(target.dataset.link));
      this.scope = this.options.scope || null;
      this.setupLinkData();
      this.on('after:render', () => {
        this.renderHeader();
      });
    }
    afterRender() {
      this.$noData = this.$el.find('.no-data');
      this.$el.find('input[data-name="quick-search"]').focus();
    }
    createLink() {
      this.createView('edit', 'views/admin/link-manager/modals/edit', {
        scope: this.scope
      }, view => {
        view.render();
        this.listenTo(view, 'after:save', () => {
          this.clearView('edit');
          this.setupLinkData();
          this.render();
        });
        this.listenTo(view, 'close', () => {
          this.clearView('edit');
        });
      });
    }
    editLink(link) {
      this.createView('edit', 'views/admin/link-manager/modals/edit', {
        scope: this.scope,
        link: link
      }, view => {
        view.render();
        this.listenTo(view, 'after:save', () => {
          this.clearView('edit');
          this.setupLinkData();
          this.render();
        });
        this.listenTo(view, 'close', () => {
          this.clearView('edit');
        });
      });
    }
    removeLink(link) {
      Espo.Ajax.postRequest('EntityManager/action/removeLink', {
        entity: this.scope,
        link: link
      }).then(() => {
        this.$el.find(`table tr[data-link="${link}"]`).remove();
        this.getMetadata().loadSkipCache().then(() => {
          this.setupLinkData();
          Espo.Ui.success(this.translate('Removed'), {
            suppress: true
          });
          this.reRender();
        });
      });
    }
    renderHeader() {
      const $header = $('#scope-header');
      if (!this.scope) {
        $header.html('');
        return;
      }
      $header.show().html(this.getLanguage().translate(this.scope, 'scopeNames'));
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Entity Manager', 'labels', 'Admin'));
    }
    processQuickSearch(text) {
      text = text.trim();
      const $noData = this.$noData;
      $noData.addClass('hidden');
      if (!text) {
        this.$el.find('table tr.link-row').removeClass('hidden');
        return;
      }
      const matchedList = [];
      const lowerCaseText = text.toLowerCase();
      this.linkDataList.forEach(item => {
        let matched = false;
        const label = item.label || '';
        const link = item.link || '';
        const entityForeign = item.entityForeign || '';
        const labelEntityForeign = item.labelEntityForeign || '';
        if (label.toLowerCase().indexOf(lowerCaseText) === 0 || link.toLowerCase().indexOf(lowerCaseText) === 0 || entityForeign.toLowerCase().indexOf(lowerCaseText) === 0 || labelEntityForeign.toLowerCase().indexOf(lowerCaseText) === 0) {
          matched = true;
        }
        if (!matched) {
          const wordList = link.split(' ').concat(label.split(' ')).concat(entityForeign.split(' ')).concat(labelEntityForeign.split(' '));
          wordList.forEach(word => {
            if (word.toLowerCase().indexOf(lowerCaseText) === 0) {
              matched = true;
            }
          });
        }
        if (matched) {
          matchedList.push(link);
        }
      });
      if (matchedList.length === 0) {
        this.$el.find('table tr.link-row').addClass('hidden');
        $noData.removeClass('hidden');
        return;
      }
      this.linkDataList.map(item => item.link).forEach(scope => {
        if (!~matchedList.indexOf(scope)) {
          this.$el.find(`table tr.link-row[data-link="${scope}"]`).addClass('hidden');
          return;
        }
        this.$el.find(`table tr.link-row[data-link="${scope}"]`).removeClass('hidden');
      });
    }

    /**
     * @private
     * @param {string} link
     */
    async actionEditParams(link) {
      const view = new _editParams.default({
        entityType: this.scope,
        link: link
      });
      await this.assignView('dialog', view);
      await view.render();
    }
  }
  var _default = _exports.default = LinkManagerIndexView;
});

define("views/admin/layouts/list", ["exports", "views/admin/layouts/rows"], function (_exports, _rows) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _rows = _interopRequireDefault(_rows);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutListView extends _rows.default {
    dataAttributeList = ['name', 'widthComplex', 'width', 'widthPx', 'link', 'notSortable', 'noLabel', 'align', 'view', 'customLabel', 'label', 'hidden'];
    dataAttributesDefs = {
      widthComplex: {
        label: 'width',
        type: 'base',
        view: 'views/admin/layouts/fields/width-complex',
        tooltip: 'width',
        notStorable: true
      },
      link: {
        type: 'bool',
        tooltip: true
      },
      width: {
        type: 'float',
        min: 0,
        max: 100,
        hidden: true
      },
      widthPx: {
        type: 'int',
        min: 0,
        max: 720,
        hidden: true
      },
      notSortable: {
        type: 'bool',
        tooltip: true
      },
      align: {
        type: 'enum',
        options: ['left', 'right']
      },
      view: {
        type: 'varchar',
        readOnly: true
      },
      noLabel: {
        type: 'bool',
        tooltip: true
      },
      customLabel: {
        type: 'varchar',
        readOnly: true
      },
      name: {
        type: 'varchar',
        readOnly: true
      },
      label: {
        type: 'varchar',
        readOnly: true
      },
      hidden: {
        type: 'bool'
      }
    };
    dataAttributesDynamicLogicDefs = {
      fields: {
        widthPx: {
          visible: {
            conditionGroup: [{
              attribute: 'width',
              type: 'isEmpty'
            }]
          }
        }
      }
    };
    editable = true;
    languageCategory = 'fields';
    ignoreList = [];
    ignoreTypeList = [];

    /**
     * @protected
     * @type {number}
     */
    defaultWidth = 16;
    setup() {
      super.setup();
      this.wait(new Promise(resolve => this.loadLayout(() => resolve())));
    }

    /**
     * @inheritDoc
     */
    loadLayout(callback) {
      this.getModelFactory().create(Espo.Utils.hyphenToUpperCamelCase(this.scope), model => {
        this.getHelper().layoutManager.getOriginal(this.scope, this.type, this.setId, layout => {
          this.readDataFromLayout(model, layout);
          callback();
        });
      });
    }
    readDataFromLayout(model, layout) {
      const allFields = [];
      for (const field in model.defs.fields) {
        if (this.checkFieldType(model.getFieldParam(field, 'type')) && this.isFieldEnabled(model, field)) {
          allFields.push(field);
        }
      }
      allFields.sort((v1, v2) => {
        return this.translate(v1, 'fields', this.scope).localeCompare(this.translate(v2, 'fields', this.scope));
      });
      this.enabledFieldsList = [];
      this.enabledFields = [];
      this.disabledFields = [];
      const labelList = [];
      const duplicateLabelList = [];
      for (const item of layout) {
        const label = this.getLanguage().translate(item.name, 'fields', this.scope);
        if (labelList.includes(label)) {
          duplicateLabelList.push(label);
        }
        labelList.push(label);
        this.enabledFields.push({
          name: item.name,
          labelText: label
        });
        this.enabledFieldsList.push(item.name);
      }
      for (const field of allFields) {
        if (this.enabledFieldsList.includes(field)) {
          continue;
        }
        const label = this.getLanguage().translate(field, 'fields', this.scope);
        if (labelList.includes(label)) {
          duplicateLabelList.push(label);
        }
        labelList.push(label);
        const fieldName = field;
        const item = {
          name: fieldName,
          labelText: label
        };
        const fieldType = this.getMetadata().get(['entityDefs', this.scope, 'fields', fieldName, 'type']);
        this.itemsData[fieldName] = this.itemsData[fieldName] || {};
        if (fieldType && this.getMetadata().get(`fields.${fieldType}.notSortable`)) {
          item.notSortable = true;
          this.itemsData[fieldName].notSortable = true;
        }
        item.width = this.defaultWidth;
        this.itemsData[fieldName].width = this.defaultWidth;
        this.disabledFields.push(item);
      }
      this.enabledFields.forEach(item => {
        if (duplicateLabelList.includes(item.labelText)) {
          item.labelText += ' (' + item.name + ')';
        }
      });
      this.disabledFields.forEach(item => {
        if (duplicateLabelList.includes(item.labelText)) {
          item.labelText += ' (' + item.name + ')';
        }

        //item.width = this.defaultWidth;
      });
      this.rowLayout = layout;
      for (const it of this.rowLayout) {
        let label = this.getLanguage().translate(it.name, 'fields', this.scope);
        this.enabledFields.forEach(item => {
          if (it.name === item.name) {
            label = item.labelText;
          }
        });
        it.labelText = label;
        this.itemsData[it.name] = Espo.Utils.cloneDeep(it);
      }
    }

    // noinspection JSUnusedLocalSymbols
    checkFieldType(type) {
      return true;
    }
    isFieldEnabled(model, name) {
      if (this.ignoreList.indexOf(name) !== -1) {
        return false;
      }
      if (this.ignoreTypeList.indexOf(model.getFieldParam(name, 'type')) !== -1) {
        return false;
      }

      /** @type {string[]|null} */
      const layoutList = model.getFieldParam(name, 'layoutAvailabilityList');
      let realType = this.realType;
      if (realType === 'listSmall') {
        realType = 'list';
      }
      if (layoutList && !layoutList.includes(this.type) && !layoutList.includes(realType)) {
        return false;
      }
      const layoutIgnoreList = model.getFieldParam(name, 'layoutIgnoreList') || [];
      if (layoutIgnoreList.includes(realType) || layoutIgnoreList.includes(this.type)) {
        return false;
      }
      return !model.getFieldParam(name, 'disabled') && !model.getFieldParam(name, 'utility') && !model.getFieldParam(name, 'layoutListDisabled');
    }
  }
  var _default = _exports.default = LayoutListView;
});

define("views/admin/layouts/index", ["exports", "view", "views/admin/layouts/default-page", "views/admin/layouts/modals/create"], function (_exports, _view, _defaultPage, _create) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _defaultPage = _interopRequireDefault(_defaultPage);
  _create = _interopRequireDefault(_create);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutIndexView extends _view.default {
    template = 'admin/layouts/index';
    scopeList = null;
    baseUrl = '#Admin/layouts';
    typeList = ['list', 'detail', 'listSmall', 'detailSmall', 'bottomPanelsDetail', 'filters', 'massUpdate', 'sidePanelsDetail', 'sidePanelsEdit', 'sidePanelsDetailSmall', 'sidePanelsEditSmall'];
    /**
     * @type {string|null}
     */
    scope = null;
    /**
     * @type {string|null}
     */
    type = null;
    data() {
      return {
        scopeList: this.scopeList,
        typeList: this.typeList,
        scope: this.scope,
        layoutScopeDataList: this.getLayoutScopeDataList(),
        headerHtml: this.getHeaderHtml(),
        em: this.em
      };
    }
    setup() {
      this.addHandler('click', '#layouts-menu a.layout-link', 'onLayoutLinkClick');
      this.addHandler('click', 'a.accordion-toggle', 'onItemHeaderClick');
      this.addHandler('keydown.shortcuts', '', 'onKeyDown');
      this.addActionHandler('createLayout', () => this.actionCreateLayout());
      this.em = this.options.em || false;
      this.scope = this.options.scope || null;
      this.type = this.options.type || null;
      this.scopeList = [];
      const scopeFullList = this.getMetadata().getScopeList().sort((v1, v2) => {
        return this.translate(v1, 'scopeNamesPlural').localeCompare(this.translate(v2, 'scopeNamesPlural'));
      });
      scopeFullList.forEach(scope => {
        if (this.getMetadata().get('scopes.' + scope + '.entity') && this.getMetadata().get('scopes.' + scope + '.layouts')) {
          this.scopeList.push(scope);
        }
      });
      if (this.em && this.scope) {
        if (this.scopeList.includes(this.scope)) {
          this.scopeList = [this.scope];
        } else {
          this.scopeList = [];
        }
      }
      this.on('after:render', () => {
        $("#layouts-menu a[data-scope='" + this.options.scope + "'][data-type='" + this.options.type + "']").addClass('disabled');
        this.renderLayoutHeader();
        if (!this.options.scope || !this.options.type) {
          this.checkLayout();
          this.renderDefaultPage();
        }
        if (this.scope && this.options.type) {
          this.checkLayout();
          this.openLayout(this.options.scope, this.options.type);
        }
      });
    }
    checkLayout() {
      const scope = this.options.scope;
      const type = this.options.type;
      if (!scope) {
        return;
      }
      const item = this.getLayoutScopeDataList().find(item => item.scope === scope);
      if (!item) {
        throw new Espo.Exceptions.NotFound("Layouts not available for entity type.");
      }
      if (type && !item.typeList.includes(type)) {
        throw new Espo.Exceptions.NotFound("The layout type is not available for the entity type.");
      }
    }
    afterRender() {
      // To ensure notify about added field is closed. When followed to here from the field manager.
      Espo.Ui.notify();
      this.controlActiveButton();
    }
    controlActiveButton() {
      if (!this.scope) {
        return;
      }
      const $header = this.$el.find(`.accordion-toggle[data-scope="${this.scope}"]`);
      this.undisableLinks();
      if (this.em && this.scope && !this.type) {
        $header.addClass('disabled');
        return;
      }
      $header.removeClass('disabled');
      this.$el.find(`a.layout-link[data-scope="${this.scope}"][data-type="${this.type}"]`).addClass('disabled');
    }

    /**
     * @param {MouseEvent} e
     */
    onLayoutLinkClick(e) {
      e.preventDefault();
      const scope = $(e.target).data('scope');
      const type = $(e.target).data('type');
      if (this.getContentView()) {
        if (this.scope === scope && this.type === type) {
          return;
        }
      }
      this.getRouter().checkConfirmLeaveOut(() => {
        this.openLayout(scope, type);
        this.controlActiveButton();
      });
    }
    openDefaultPage() {
      this.clearView('content');
      this.type = null;
      this.renderDefaultPage();
      this.controlActiveButton();
      this.navigate(this.scope);
    }

    /**
     * @param {MouseEvent} e
     */
    onItemHeaderClick(e) {
      e.preventDefault();
      if (this.em) {
        if (!this.getContentView()) {
          return;
        }
        this.getRouter().checkConfirmLeaveOut(() => {
          this.openDefaultPage();
        });
        return;
      }
      const $target = $(e.target);
      const scope = $target.data('scope');
      const $collapse = $('.collapse[data-scope="' + scope + '"]');
      $collapse.hasClass('in') ? $collapse.collapse('hide') : $collapse.collapse('show');
    }

    /**
     * @param {KeyboardEvent} e
     */
    onKeyDown(e) {
      const key = Espo.Utils.getKeyFromKeyEvent(e);
      if (!this.hasView('content')) {
        return;
      }
      if (key === 'Control+Enter' || key === 'Control+KeyS') {
        e.stopPropagation();
        e.preventDefault();
        this.getContentView().actionSave();
      }
    }
    undisableLinks() {
      $("#layouts-menu a.layout-link").removeClass('disabled');
    }

    /**
     * @return {module:views/admin/layouts/base}
     */
    getContentView() {
      return this.getView('content');
    }
    openLayout(scope, type) {
      this.scope = scope;
      this.type = type;
      this.navigate(scope, type);
      Espo.Ui.notify(' ... ');
      const typeReal = this.getMetadata().get('clientDefs.' + scope + '.additionalLayouts.' + type + '.type') || type;
      this.createView('content', 'views/admin/layouts/' + Espo.Utils.camelCaseToHyphen(typeReal), {
        fullSelector: '#layout-content',
        scope: scope,
        type: type,
        realType: typeReal,
        setId: this.setId,
        em: this.em
      }, view => {
        this.renderLayoutHeader();
        view.render();
        Espo.Ui.notify(false);
        $(window).scrollTop(0);
        if (this.em) {
          this.listenToOnce(view, 'cancel', () => {
            this.openDefaultPage();
          });
          this.listenToOnce(view, 'after-delete', () => {
            this.openDefaultPage();
            Promise.all([this.getMetadata().loadSkipCache(), this.getLanguage().loadSkipCache()]).then(() => {
              this.reRender();
            });
          });
        }
      });
    }
    navigate(scope, type) {
      let url = '#Admin/layouts/scope=' + scope;
      if (type) {
        url += '&type=' + type;
      }
      if (this.em) {
        url += '&em=true';
      }
      this.getRouter().navigate(url, {
        trigger: false
      });
    }
    renderDefaultPage() {
      $('#layout-header').html('').hide();
      if (this.em) {
        this.assignView('default', new _defaultPage.default(), '#layout-content').then(/** LayoutDefaultPageView */view => {
          view.render();
        });
        return;
      }
      this.clearView('default');
      $('#layout-content').html(this.translate('selectLayout', 'messages', 'Admin'));
    }
    renderLayoutHeader() {
      const $header = $('#layout-header');
      if (!this.scope) {
        $header.html('');
        return;
      }
      const list = [];
      const separatorHtml = '<span class="breadcrumb-separator"><span></span></span>';
      if (!this.em) {
        list.push($('<span>').text(this.translate(this.scope, 'scopeNames')));
      }
      list.push($('<span>').text(this.translateLayoutName(this.type, this.scope)));
      const html = list.map($item => $item.get(0).outerHTML).join(' ' + separatorHtml + ' ');
      $header.show().html(html);
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Layout Manager', 'labels', 'Admin'));
    }
    getHeaderHtml() {
      const separatorHtml = '<span class="breadcrumb-separator"><span></span></span>';
      const list = [];
      const $root = $('<a>').attr('href', '#Admin').text(this.translate('Administration'));
      list.push($root);
      if (this.em) {
        list.push($('<a>').attr('href', '#Admin/entityManager').text(this.translate('Entity Manager', 'labels', 'Admin')));
        if (this.scope) {
          list.push($('<a>').attr('href', `#Admin/entityManager/scope=` + this.scope).text(this.translate(this.scope, 'scopeNames')));
          list.push($('<span>').text(this.translate('Layouts', 'labels', 'EntityManager')));
        }
      } else {
        list.push($('<span>').text(this.translate('Layout Manager', 'labels', 'Admin')));
      }
      return list.map($item => $item.get(0).outerHTML).join(' ' + separatorHtml + ' ');
    }
    translateLayoutName(type, scope) {
      if (this.getLanguage().get(scope, 'layouts', type)) {
        return this.getLanguage().translate(type, 'layouts', scope);
      }
      return this.getLanguage().translate(type, 'layouts', 'Admin');
    }
    getLayoutScopeDataList() {
      const dataList = [];
      this.scopeList.forEach(scope => {
        const item = {};
        let typeList = Espo.Utils.clone(this.typeList);
        item.scope = scope;
        item.url = this.baseUrl + '/scope=' + scope;
        if (this.em) {
          item.url += '&em=true';
        }
        if (this.getMetadata().get(['clientDefs', scope, 'bottomPanels', 'edit'])) {
          typeList.push('bottomPanelsEdit');
        }
        if (!this.getMetadata().get(['clientDefs', scope, 'defaultSidePanelDisabled']) && !this.getMetadata().get(['clientDefs', scope, 'defaultSidePanelFieldList'])) {
          typeList.push('defaultSidePanel');
        }
        if (this.getMetadata().get(['clientDefs', scope, 'kanbanViewMode'])) {
          typeList.push('kanban');
        }
        const additionalLayouts = this.getMetadata().get(['clientDefs', scope, 'additionalLayouts']) || {};
        for (const aItem in additionalLayouts) {
          typeList.push(aItem);
        }
        typeList = typeList.filter(name => {
          return !this.getMetadata().get(['clientDefs', scope, 'layout' + Espo.Utils.upperCaseFirst(name) + 'Disabled']);
        });
        const typeDataList = [];
        typeList.forEach(type => {
          let url = this.baseUrl + '/scope=' + scope + '&type=' + type;
          if (this.em) {
            url += '&em=true';
          }
          typeDataList.push({
            type: type,
            url: url,
            label: this.translateLayoutName(type, scope)
          });
        });
        item.typeList = typeList;
        item.typeDataList = typeDataList;
        dataList.push(item);
      });
      return dataList;
    }
    actionCreateLayout() {
      const view = new _create.default({
        scope: this.scope
      });
      this.assignView('dialog', view).then(/** LayoutCreateModalView */view => {
        view.render();
        this.listenToOnce(view, 'done', () => {
          Promise.all([this.getMetadata().loadSkipCache(), this.getLanguage().loadSkipCache()]).then(() => {
            this.reRender();
          });
        });
      });
    }
  }
  var _default = _exports.default = LayoutIndexView;
});

define("views/admin/layouts/detail", ["exports", "views/admin/layouts/grid"], function (_exports, _grid) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _grid = _interopRequireDefault(_grid);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutDetailView extends _grid.default {
    dataAttributeList = ['name', 'fullWidth', 'customLabel', 'noLabel'];
    panelDataAttributeList = ['panelName', 'dynamicLogicVisible', 'style', 'dynamicLogicStyled', 'tabBreak', 'tabLabel', 'hidden', 'noteText', 'noteStyle'];
    dataAttributesDefs = {
      fullWidth: {
        type: 'bool'
      },
      name: {
        readOnly: true
      },
      label: {
        type: 'varchar',
        readOnly: true
      },
      customLabel: {
        type: 'varchar',
        readOnly: true
      },
      noLabel: {
        type: 'bool',
        readOnly: true
      }
    };
    panelDataAttributesDefs = {
      panelName: {
        type: 'varchar'
      },
      style: {
        type: 'enum',
        options: ['default', 'success', 'danger', 'warning', 'info'],
        style: {
          'info': 'info',
          'success': 'success',
          'danger': 'danger',
          'warning': 'warning'
        },
        default: 'default',
        translation: 'LayoutManager.options.style',
        tooltip: 'panelStyle'
      },
      dynamicLogicVisible: {
        type: 'base',
        view: 'views/admin/field-manager/fields/dynamic-logic-conditions'
      },
      dynamicLogicStyled: {
        type: 'base',
        view: 'views/admin/field-manager/fields/dynamic-logic-conditions',
        tooltip: 'dynamicLogicStyled'
      },
      hidden: {
        type: 'bool',
        tooltip: 'hiddenPanel'
      },
      tabBreak: {
        type: 'bool',
        tooltip: 'tabBreak'
      },
      tabLabel: {
        type: 'varchar'
      },
      noteText: {
        type: 'text',
        tooltip: 'noteText'
      },
      noteStyle: {
        type: 'enum',
        options: ['info', 'success', 'danger', 'warning'],
        style: {
          'info': 'info',
          'success': 'success',
          'danger': 'danger',
          'warning': 'warning'
        },
        default: 'info',
        translation: 'LayoutManager.options.style'
      }
    };
    defaultPanelFieldList = ['modifiedAt', 'createdAt', 'modifiedBy', 'createdBy'];
    panelDynamicLogicDefs = {
      fields: {
        tabLabel: {
          visible: {
            conditionGroup: [{
              attribute: 'tabBreak',
              type: 'isTrue'
            }]
          }
        },
        dynamicLogicStyled: {
          visible: {
            conditionGroup: [{
              attribute: 'style',
              type: 'notEquals',
              value: 'default'
            }]
          }
        },
        noteStyle: {
          visible: {
            conditionGroup: [{
              attribute: 'noteText',
              type: 'isNotEmpty'
            }]
          }
        }
      }
    };
    setup() {
      super.setup();
      this.panelDataAttributesDefs = Espo.Utils.cloneDeep(this.panelDataAttributesDefs);
      this.panelDataAttributesDefs.dynamicLogicVisible.scope = this.scope;
      this.panelDataAttributesDefs.dynamicLogicStyled.scope = this.scope;
      this.wait(true);
      this.loadLayout(() => {
        this.setupPanels();
        this.wait(false);
      });
    }
    loadLayout(callback) {
      let layout;
      let model;
      const promiseList = [];
      promiseList.push(new Promise(resolve => {
        this.getModelFactory().create(this.scope, m => {
          this.getHelper().layoutManager.getOriginal(this.scope, this.type, this.setId, layoutLoaded => {
            layout = layoutLoaded;
            model = m;
            resolve();
          });
        });
      }));
      if (['detail', 'detailSmall'].includes(this.type)) {
        promiseList.push(new Promise(resolve => {
          this.getHelper().layoutManager.getOriginal(this.scope, 'sidePanels' + Espo.Utils.upperCaseFirst(this.type), this.setId, layoutLoaded => {
            this.sidePanelsLayout = layoutLoaded;
            resolve();
          });
        }));
      }
      promiseList.push(new Promise(resolve => {
        if (this.getMetadata().get(['clientDefs', this.scope, 'layoutDefaultSidePanelDisabled'])) {
          resolve();
          return;
        }
        if (this.typeDefs.allFields) {
          resolve();
          return;
        }
        this.getHelper().layoutManager.getOriginal(this.scope, 'defaultSidePanel', this.setId, layoutLoaded => {
          this.defaultPanelFieldList = Espo.Utils.clone(this.defaultPanelFieldList);
          layoutLoaded.forEach(item => {
            let field = item.name;
            if (!field) {
              return;
            }
            if (field === ':assignedUser') {
              field = 'assignedUser';
            }
            if (!this.defaultPanelFieldList.includes(field)) {
              this.defaultPanelFieldList.push(field);
            }
          });
          resolve();
        });
      }));
      Promise.all(promiseList).then(() => {
        this.readDataFromLayout(model, layout);
        if (callback) {
          callback();
        }
      });
    }
    readDataFromLayout(model, layout) {
      const allFields = [];
      for (const field in model.defs.fields) {
        if (this.isFieldEnabled(model, field)) {
          allFields.push(field);
        }
      }
      this.enabledFields = [];
      this.disabledFields = [];
      this.panels = layout;
      layout.forEach(panel => {
        panel.rows.forEach(row => {
          row.forEach(cell => {
            this.enabledFields.push(cell.name);
          });
        });
      });
      allFields.sort((v1, v2) => {
        return this.translate(v1, 'fields', this.scope).localeCompare(this.translate(v2, 'fields', this.scope));
      });
      for (const i in allFields) {
        if (!_.contains(this.enabledFields, allFields[i])) {
          this.disabledFields.push(allFields[i]);
        }
      }
    }
    isFieldEnabled(model, name) {
      if (this.hasDefaultPanel()) {
        if (this.defaultPanelFieldList.includes(name)) {
          return false;
        }
      }
      const layoutList = model.getFieldParam(name, 'layoutAvailabilityList');
      let realType = this.realType;
      if (realType === 'detailSmall') {
        realType = 'detail';
      }
      if (layoutList && !layoutList.includes(this.type) && !layoutList.includes(realType)) {
        return false;
      }
      const layoutIgnoreList = model.getFieldParam(name, 'layoutIgnoreList') || [];
      if (layoutIgnoreList.includes(realType) || layoutIgnoreList.includes(this.type)) {
        return false;
      }
      return !model.getFieldParam(name, 'disabled') && !model.getFieldParam(name, 'utility') && !model.getFieldParam(name, 'layoutDetailDisabled');
    }
    hasDefaultPanel() {
      if (this.getMetadata().get(['clientDefs', this.scope, 'defaultSidePanel', this.viewType]) === false) {
        return false;
      }
      if (this.getMetadata().get(['clientDefs', this.scope, 'defaultSidePanelDisabled'])) {
        return false;
      }
      if (this.sidePanelsLayout) {
        for (const name in this.sidePanelsLayout) {
          if (name === 'default' && this.sidePanelsLayout[name].disabled) {
            return false;
          }
        }
      }
      return true;
    }
    validate(layout) {
      if (!super.validate(layout)) {
        return false;
      }
      const fieldList = [];
      layout.forEach(panel => {
        panel.rows.forEach(row => {
          row.forEach(cell => {
            if (cell !== false && cell !== null) {
              if (cell.name) {
                fieldList.push(cell.name);
              }
            }
          });
        });
      });
      let incompatibleFieldList = [];
      let isIncompatible = false;
      fieldList.forEach(field => {
        if (isIncompatible) {
          return;
        }
        const defs = /** @type {Record} */
        this.getMetadata().get(['entityDefs', this.scope, 'fields', field]) || {};
        const targetFieldList = defs.detailLayoutIncompatibleFieldList || [];
        targetFieldList.forEach(itemField => {
          if (isIncompatible) {
            return;
          }
          if (~fieldList.indexOf(itemField)) {
            isIncompatible = true;
            incompatibleFieldList = [field].concat(targetFieldList);
          }
        });
      });
      if (isIncompatible) {
        Espo.Ui.error(this.translate('fieldsIncompatible', 'messages', 'LayoutManager').replace('{fields}', incompatibleFieldList.map(field => this.translate(field, 'fields', this.scope)).join(', ')));
        return false;
      }
      return true;
    }
  }
  var _default = _exports.default = LayoutDetailView;
});

define("views/admin/layouts/bottom-panels-edit", ["exports", "views/admin/layouts/bottom-panels-detail"], function (_exports, _bottomPanelsDetail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _bottomPanelsDetail = _interopRequireDefault(_bottomPanelsDetail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutBottomPanelsEdit extends _bottomPanelsDetail.default {
    hasStream = false;
    hasRelationships = false;
    viewType = 'edit';
  }
  var _default = _exports.default = LayoutBottomPanelsEdit;
});

define("views/admin/integrations/edit", ["exports", "view", "model"], function (_exports, _view, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class IntegrationsEditView extends _view.default {
    template = 'admin/integrations/edit';
    data() {
      return {
        integration: this.integration,
        dataFieldList: this.dataFieldList,
        helpText: this.helpText
      };
    }
    events = {
      /** @this IntegrationsEditView */
      'click button[data-action="cancel"]': function () {
        this.getRouter().navigate('#Admin/integrations', {
          trigger: true
        });
      },
      /** @this IntegrationsEditView */
      'click button[data-action="save"]': function () {
        this.save();
      }
    };
    setup() {
      this.integration = this.options.integration;
      this.helpText = false;
      if (this.getLanguage().has(this.integration, 'help', 'Integration')) {
        this.helpText = this.translate(this.integration, 'help', 'Integration');
      }
      this.fieldList = [];
      this.dataFieldList = [];
      this.model = new _model.default();
      this.model.id = this.integration;
      this.model.name = 'Integration';
      this.model.urlRoot = 'Integration';
      this.model.defs = {
        fields: {
          enabled: {
            required: true,
            type: 'bool'
          }
        }
      };
      this.wait(true);
      this.fields = this.getMetadata().get(`integrations.${this.integration}.fields`);
      Object.keys(this.fields).forEach(name => {
        this.model.defs.fields[name] = this.fields[name];
        this.dataFieldList.push(name);
      });
      this.model.populateDefaults();
      this.listenToOnce(this.model, 'sync', () => {
        this.createFieldView('bool', 'enabled');
        Object.keys(this.fields).forEach(name => {
          this.createFieldView(this.fields[name]['type'], name, null, this.fields[name]);
        });
        this.wait(false);
      });
      this.model.fetch();
    }
    hideField(name) {
      this.$el.find('label[data-name="' + name + '"]').addClass('hide');
      this.$el.find('div.field[data-name="' + name + '"]').addClass('hide');
      const view = this.getView(name);
      if (view) {
        view.disabled = true;
      }
    }
    showField(name) {
      this.$el.find('label[data-name="' + name + '"]').removeClass('hide');
      this.$el.find('div.field[data-name="' + name + '"]').removeClass('hide');
      const view = this.getFieldView(name);
      if (view) {
        view.disabled = false;
      }
    }

    /**
     * @since 9.0.0
     * @param {string} name
     * @return {import('views/fields/base').default}
     */
    getFieldView(name) {
      return this.getView(name);
    }
    afterRender() {
      if (!this.model.get('enabled')) {
        this.dataFieldList.forEach(name => {
          this.hideField(name);
        });
      }
      this.listenTo(this.model, 'change:enabled', () => {
        if (this.model.get('enabled')) {
          this.dataFieldList.forEach(name => this.showField(name));
        } else {
          this.dataFieldList.forEach(name => this.hideField(name));
        }
      });
    }
    createFieldView(type, name, readOnly, params) {
      const viewName = this.model.getFieldParam(name, 'view') || this.getFieldManager().getViewName(type);
      this.createView(name, viewName, {
        model: this.model,
        selector: `.field[data-name="${name}"]`,
        defs: {
          name: name,
          params: params
        },
        mode: readOnly ? 'detail' : 'edit',
        readOnly: readOnly
      });
      this.fieldList.push(name);
    }
    save() {
      this.fieldList.forEach(field => {
        const view = this.getFieldView(field);
        if (!view.readOnly) {
          view.fetchToModel();
        }
      });
      let notValid = false;
      this.fieldList.forEach(field => {
        const fieldView = this.getFieldView(field);
        if (fieldView && !fieldView.disabled) {
          notValid = fieldView.validate() || notValid;
        }
      });
      if (notValid) {
        Espo.Ui.error(this.translate('Not valid'));
        return;
      }
      this.listenToOnce(this.model, 'sync', () => {
        Espo.Ui.success(this.translate('Saved'));
      });
      Espo.Ui.notify(this.translate('saving', 'messages'));
      this.model.save();
    }
  }
  _exports.default = IntegrationsEditView;
});

define("views/admin/field-manager/fields/options", ["exports", "views/fields/array"], function (_exports, _array) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _array = _interopRequireDefault(_array);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class FieldManagerOptionsFieldView extends _array.default {
    maxItemLength = 100;
    setup() {
      super.setup();
      this.translatedOptions = {};
      const list = this.model.get(this.name) || [];
      list.forEach(value => {
        this.translatedOptions[value] = this.getLanguage().translateOption(value, this.options.field, this.options.scope);
      });
      this.model.fetchedAttributes.translatedOptions = this.translatedOptions;
    }
    getItemHtml(value) {
      // Do not use the `html` method to avoid XSS.

      const text = this.translatedOptions[value] || value;
      const $div = $('<div>').addClass('list-group-item link-with-role form-inline').attr('data-value', value).append($('<div>').addClass('pull-left item-content').css('width', '92%').css('display', 'inline-block').append($('<input>').attr('type', 'text').attr('data-name', 'translatedValue').attr('data-value', value).addClass('role form-control input-sm pull-right').attr('value', text).css('width', 'auto')).append($('<div>').addClass('item-text').text(value))).append($('<div>').css('width', '8%').css('display', 'inline-block').css('vertical-align', 'top').append($('<a>').attr('role', 'button').attr('tabindex', '0').addClass('pull-right').attr('data-value', value).attr('data-action', 'removeValue').append($('<span>').addClass('fas fa-times')))).append($('<br>').css('clear', 'both'));
      return $div.get(0).outerHTML;
    }
    fetch() {
      const data = super.fetch();
      if (!data[this.name].length) {
        data[this.name] = null;
        data.translatedOptions = {};
        return data;
      }
      data.translatedOptions = {};
      (data[this.name] || []).forEach(value => {
        const valueInternal = CSS.escape(value);
        const translatedValue = this.$el.find(`input[data-name="translatedValue"][data-value="${valueInternal}"]`).val() || value;
        data.translatedOptions[value] = translatedValue.toString();
      });
      return data;
    }
  }
  _exports.default = FieldManagerOptionsFieldView;
});

define("views/admin/entity-manager/record/edit-formula", ["exports", "views/record/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class EntityManagerEditFormulaRecordView extends _base.default {
    template = 'admin/entity-manager/record/edit-formula';
    data() {
      return {
        field: this.field,
        fieldKey: this.field + 'Field'
      };
    }
    setup() {
      super.setup();
      this.field = this.options.type;
      let additionalFunctionDataList = null;
      if (this.options.type === 'beforeSaveApiScript') {
        additionalFunctionDataList = this.getRecordServiceFunctionDataList();
      }
      this.createField(this.field, 'views/fields/formula', {
        targetEntityType: this.options.targetEntityType,
        height: 504
      }, 'edit', false, {
        additionalFunctionDataList: additionalFunctionDataList
      });
    }
    getRecordServiceFunctionDataList() {
      return [{
        name: 'recordService\\skipDuplicateCheck',
        insertText: 'recordService\\skipDuplicateCheck()',
        returnType: 'bool'
      }, {
        name: 'recordService\\throwDuplicateConflict',
        insertText: 'recordService\\throwDuplicateConflict(RECORD_ID)'
      }, {
        name: 'recordService\\throwBadRequest',
        insertText: 'recordService\\throwBadRequest(MESSAGE)'
      }, {
        name: 'recordService\\throwForbidden',
        insertText: 'recordService\\throwForbidden(MESSAGE)'
      }, {
        name: 'recordService\\throwConflict',
        insertText: 'recordService\\throwConflict(MESSAGE)'
      }];
    }
  }
  var _default = _exports.default = EntityManagerEditFormulaRecordView;
});

define("views/admin/entity-manager/modals/export", ["exports", "views/modal", "model", "views/record/edit-for-modal", "views/fields/varchar"], function (_exports, _modal, _model, _editForModal, _varchar) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  _model = _interopRequireDefault(_model);
  _editForModal = _interopRequireDefault(_editForModal);
  _varchar = _interopRequireDefault(_varchar);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class EntityManagerExportModalView extends _modal.default {
    // language=Handlebars
    templateContent = `
        <div class="record-container no-side-margin">{{{record}}}</div>
    `;
    setup() {
      this.headerText = this.translate('Export');
      this.buttonList = [{
        name: 'export',
        label: 'Export',
        style: 'danger',
        onClick: () => this.export()
      }, {
        name: 'cancel',
        label: 'Cancel'
      }];

      /** @type {Record} */
      const manifest = this.getConfig().get('customExportManifest') || {};
      this.model = new _model.default({
        name: manifest.name ?? null,
        module: manifest.module ?? null,
        version: manifest.version ?? '0.0.1',
        author: manifest.author ?? null,
        description: manifest.description ?? null
      });
      this.recordView = new _editForModal.default({
        model: this.model,
        detailLayout: [{
          rows: [[{
            view: new _varchar.default({
              name: 'name',
              labelText: this.translate('name', 'fields'),
              params: {
                pattern: '$latinLettersDigitsWhitespace',
                required: true
              }
            })
          }, {
            view: new _varchar.default({
              name: 'module',
              labelText: this.translate('module', 'fields', 'EntityManager'),
              params: {
                pattern: '[A-Z][a-z][A-Za-z]+',
                required: true
              }
            })
          }], [{
            view: new _varchar.default({
              name: 'version',
              labelText: this.translate('version', 'fields', 'EntityManager'),
              params: {
                pattern: '[0-9]+\\.[0-9]+\\.[0-9]+',
                required: true
              }
            })
          }, false], [{
            view: new _varchar.default({
              name: 'author',
              labelText: this.translate('author', 'fields', 'EntityManager'),
              params: {
                required: true
              }
            })
          }, {
            view: new _varchar.default({
              name: 'description',
              labelText: this.translate('description', 'fields'),
              params: {}
            })
          }]]
        }]
      });
      this.assignView('record', this.recordView);
    }
    export() {
      const data = this.recordView.fetch();
      if (this.recordView.validate()) {
        return;
      }
      this.disableButton('export');
      Espo.Ui.notify(' ... ');
      Espo.Ajax.postRequest('EntityManager/action/exportCustom', data).then(response => {
        this.close();
        this.getConfig().set('customExportManifest', data);
        Espo.Ui.success(this.translate('Done'));
        window.location = this.getBasePath() + '?entryPoint=download&id=' + response.id;
      }).catch(() => this.enableButton('create'));
    }
  }
  var _default = _exports.default = EntityManagerExportModalView;
});

define("views/admin/entity-manager/fields/primary-filters", ["exports", "views/fields/array"], function (_exports, _array) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _array = _interopRequireDefault(_array);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class EntityManagerPrimaryFiltersFieldView extends _array.default {
    // language=Handlebars
    detailTemplateContent = `
        {{#unless isEmpty}}
            <table class="table table-bordered">
                <tbody>
                    {{#each dateList}}
                        <tr>
                            <td style="width: 42%">{{name}}</td>
                            <td style="width: 42%">{{label}}</td>
                            <td style="width: 16%; text-align: center;">
                                <a
                                    role="button"
                                    data-action="copyToClipboard"
                                    data-name="{{name}}"
                                    class="text-soft"
                                    title="{{translate 'Copy to Clipboard'}}"
                                ><span class="far fa-copy"></span></a>
                            </td>
                        </tr>
                    {{/each}}
                </tbody>
            </table>
        {{else}}
            {{#if valueIsSet}}
                <span class="none-value">{{translate 'None'}}</span>
            {{else}}
                <span class="loading-value"></span>
            {{/if}}
        {{/unless}}
    `;

    // noinspection JSCheckFunctionSignatures
    data() {
      // noinspection JSValidateTypes
      return {
        ...super.data(),
        dateList: this.getValuesItems()
      };
    }
    constructor(options) {
      super(options);
      this.targetEntityType = options.targetEntityType;
    }
    getValuesItems() {
      return (this.model.get(this.name) || []).map(/** string */item => {
        return {
          name: item,
          label: this.translate(item, 'presetFilters', this.targetEntityType)
        };
      });
    }
    setup() {
      super.setup();
      this.addActionHandler('copyToClipboard', (e, target) => this.copyToClipboard(target.dataset.name));
    }

    /**
     * @private
     * @param {string} name
     */
    copyToClipboard(name) {
      const urlPart = `#${this.targetEntityType}/list/primaryFilter=${name}`;
      navigator.clipboard.writeText(urlPart).then(() => {
        const msg = this.translate('urlHashCopiedToClipboard', 'messages', 'EntityManager').replace('{name}', name);
        Espo.Ui.notify(msg, 'success', undefined, {
          closeButton: true
        });
      });
    }
  }
  var _default = _exports.default = EntityManagerPrimaryFiltersFieldView;
});

define("views/admin/entity-manager/fields/acl-contact-link", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    targetEntityType = 'Contact';
    setupOptions() {
      const entityType = this.model.attributes.name;

      /** @type {Record.<string, {entity?: string, entityList?: string[], type: string}>} */
      const defs = this.getMetadata().get(`entityDefs.${entityType}.links`) || {};
      const options = Object.keys(defs).filter(link => {
        const linkDefs = defs[link];
        if (linkDefs.type === 'belongsToParent' && linkDefs.entityList && linkDefs.entityList.includes(this.targetEntityType)) {
          return true;
        }
        return linkDefs.entity === this.targetEntityType;
      }).sort((a, b) => {
        return this.getLanguage().translate(a, 'links', entityType).localeCompare(this.getLanguage().translate(b, 'links', entityType));
      });
      options.unshift('');
      this.translatedOptions = options.reduce((p, it) => ({
        [it]: this.translate(it, 'links', entityType),
        ...p
      }), {});
      this.params.options = options;
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions-string/item-operator-only-date", ["exports", "views/admin/dynamic-logic/conditions-string/item-operator-only-base"], function (_exports, _itemOperatorOnlyBase) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _itemOperatorOnlyBase = _interopRequireDefault(_itemOperatorOnlyBase);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _itemOperatorOnlyBase.default {
    template = 'admin/dynamic-logic/conditions-string/item-operator-only-date';
    dateValue;
    data() {
      const data = super.data();
      data.dateValue = this.dateValue;
      return data;
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions-string/group-base", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class DynamicLogicConditionsStringGroupBaseView extends _view.default {
    template = 'admin/dynamic-logic/conditions-string/group-base';

    /**
     * @type {number}
     */
    level;

    /**
     * @type {string}
     */
    scope;

    /**
     * @type {number}
     */
    number;

    /**
     * @type {string}
     */
    operator;

    /**
     * @type {Record}
     */
    itemData;

    /**
     * @type {Record}
     */
    additionalData;

    /**
     * @type {string[]}
     */
    viewList;

    /**
     * @type {{key: string, isEnd: boolean}[]}
     */
    viewDataList;
    data() {
      if (!this.conditionList.length) {
        return {
          isEmpty: true
        };
      }
      return {
        viewDataList: this.viewDataList,
        operator: this.operator,
        level: this.level
      };
    }
    setup() {
      this.level = this.options.level || 0;
      this.number = this.options.number || 0;
      this.scope = this.options.scope;
      this.operator = this.options.operator || this.operator;
      this.itemData = this.options.itemData || {};
      this.viewList = [];
      const conditionList = this.conditionList = this.itemData.value || [];
      this.viewDataList = [];
      conditionList.forEach((item, i) => {
        const key = `view-${this.level.toString()}-${this.number.toString()}-${i.toString()}`;
        this.createItemView(i, key, item);
        this.viewDataList.push({
          key: key,
          isEnd: i === conditionList.length - 1
        });
      });
    }
    getFieldType(item) {
      return this.getMetadata().get(['entityDefs', this.scope, 'fields', item.attribute, 'type']) || 'base';
    }

    /**
     *
     * @param {number} number
     * @param {string} key
     * @param {{data?: Record, type?: string}} item
     */
    createItemView(number, key, item) {
      this.viewList.push(key);
      item = item || {};
      const additionalData = item.data || {};
      const type = additionalData.type || item.type || 'equals';
      const fieldType = this.getFieldType(item);
      const viewName = this.getMetadata().get(['clientDefs', 'DynamicLogic', 'fieldTypes', fieldType, 'conditionTypes', type, 'itemView']) || this.getMetadata().get(['clientDefs', 'DynamicLogic', 'itemTypes', type, 'view']);
      if (!viewName) {
        return;
      }
      const operator = this.getMetadata().get(['clientDefs', 'DynamicLogic', 'itemTypes', type, 'operator']);
      let operatorString = this.getMetadata().get(['clientDefs', 'DynamicLogic', 'itemTypes', type, 'operatorString']);
      if (!operatorString) {
        operatorString = this.getLanguage().translateOption(type, 'operators', 'DynamicLogic').toLowerCase();
        operatorString = '<i class="small">' + operatorString + '</i>';
      }
      this.createView(key, viewName, {
        itemData: item,
        scope: this.scope,
        level: this.level + 1,
        selector: `[data-view-key="${key}"]`,
        number: number,
        operator: operator,
        operatorString: operatorString
      });
    }
  }
  _exports.default = DynamicLogicConditionsStringGroupBaseView;
});

define("views/admin/dynamic-logic/conditions/group-base", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class DynamicLogicConditionGroupBaseView extends _view.default {
    template = 'admin/dynamic-logic/conditions/group-base';

    /**
     * @type {string}
     */
    operator;

    /**
     * @type {{key: string, index: number}[]}
     */
    viewDataList;

    /**
     * @type {string[]}
     */
    viewList;
    data() {
      return {
        viewDataList: this.viewDataList,
        operator: this.operator,
        level: this.level,
        groupOperator: this.getGroupOperator()
      };
    }
    events = {
      /** @this {DynamicLogicConditionGroupBaseView} */
      'click > div.group-head > [data-action="remove"]': function (e) {
        e.stopPropagation();
        this.trigger('remove-item');
      },
      /** @this {DynamicLogicConditionGroupBaseView} */
      'click > div.group-bottom [data-action="addField"]': function () {
        this.actionAddField();
      },
      /** @this {DynamicLogicConditionGroupBaseView} */
      'click > div.group-bottom [data-action="addAnd"]': function () {
        this.actionAddGroup('and');
      },
      /** @this {DynamicLogicConditionGroupBaseView} */
      'click > div.group-bottom [data-action="addOr"]': function () {
        this.actionAddGroup('or');
      },
      /** @this {DynamicLogicConditionGroupBaseView} */
      'click > div.group-bottom [data-action="addNot"]': function () {
        this.actionAddGroup('not');
      },
      /** @this {DynamicLogicConditionGroupBaseView} */
      'click > div.group-bottom [data-action="addCurrentUser"]': function () {
        this.addCurrentUser();
      },
      /** @this {DynamicLogicConditionGroupBaseView} */
      'click > div.group-bottom [data-action="addCurrentUserTeams"]': function () {
        this.addCurrentUserTeams();
      }
    };
    setup() {
      this.level = this.options.level || 0;
      this.number = this.options.number || 0;
      this.scope = this.options.scope;
      this.itemData = this.options.itemData || {};
      this.viewList = [];
      const conditionList = this.conditionList = this.itemData.value || [];
      this.viewDataList = [];
      conditionList.forEach((item, i) => {
        const key = this.getKey(i);
        this.createItemView(i, key, item);
        this.addViewDataListItem(i, key);
      });
    }
    getGroupOperator() {
      if (this.operator === 'or') {
        return 'or';
      }
      return 'and';
    }
    getKey(i) {
      return `view-${this.level.toString()}-${this.number.toString()}-${i.toString()}`;
    }
    createItemView(number, key, item) {
      this.viewList.push(key);
      this.isCurrentUser = item.attribute && item.attribute.startsWith('$user.');
      const scope = this.isCurrentUser ? 'User' : this.scope;
      item = item || {};
      const additionalData = item.data || {};
      const type = additionalData.type || item.type || 'equals';
      const field = additionalData.field || item.attribute;
      let viewName;
      let fieldType;
      if (['and', 'or', 'not'].includes(type)) {
        viewName = 'views/admin/dynamic-logic/conditions/' + type;
      } else {
        fieldType = this.getMetadata().get(['entityDefs', scope, 'fields', field, 'type']);
        if (field === 'id') {
          fieldType = 'id';
        }
        if (item.attribute === '$user.id') {
          fieldType = 'currentUser';
        }
        if (item.attribute === '$user.teamsIds') {
          fieldType = 'currentUserTeams';
        }
        if (fieldType) {
          viewName = this.getMetadata().get(['clientDefs', 'DynamicLogic', 'fieldTypes', fieldType, 'view']);
        }
      }
      if (!viewName) {
        return;
      }
      this.createView(key, viewName, {
        itemData: item,
        scope: scope,
        level: this.level + 1,
        selector: '[data-view-key="' + key + '"]',
        number: number,
        type: type,
        field: field,
        fieldType: fieldType
      }, view => {
        if (this.isRendered()) {
          view.render();
        }
        this.controlAddItemVisibility();
        this.listenToOnce(view, 'remove-item', () => {
          this.removeItem(number);
        });
      });
    }
    fetch() {
      const list = [];
      this.viewDataList.forEach(item => {
        /** @type {import('./field-types/base').default} */
        const view = this.getView(item.key);
        list.push(view.fetch());
      });
      return {
        type: this.operator,
        value: list
      };
    }
    removeItem(number) {
      const key = this.getKey(number);
      this.clearView(key);
      this.$el.find(`[data-view-key="${key}"]`).remove();
      this.$el.find(`[data-view-ref-key="${key}"]`).remove();
      let index = -1;
      this.viewDataList.forEach((data, i) => {
        if (data.index === number) {
          index = i;
        }
      });
      if (~index) {
        this.viewDataList.splice(index, 1);
      }
      this.controlAddItemVisibility();
    }
    actionAddField() {
      this.createView('modal', 'views/admin/dynamic-logic/modals/add-field', {
        scope: this.scope
      }, view => {
        view.render();
        this.listenToOnce(view, 'add-field', field => {
          this.addField(field);
          view.close();
        });
      });
    }
    addCurrentUser() {
      const i = this.getIndexForNewItem();
      const key = this.getKey(i);
      this.addItemContainer(i);
      this.addViewDataListItem(i, key);
      this.createItemView(i, key, {
        attribute: '$user.id',
        data: {
          type: 'equals'
        }
      });
    }
    addCurrentUserTeams() {
      const i = this.getIndexForNewItem();
      const key = this.getKey(i);
      this.addItemContainer(i);
      this.addViewDataListItem(i, key);
      this.createItemView(i, key, {
        attribute: '$user.teamsIds',
        data: {
          type: 'contains',
          field: 'teams'
        }
      });
    }
    addField(field) {
      let fieldType = this.getMetadata().get(['entityDefs', this.scope, 'fields', field, 'type']);
      if (!fieldType && field === 'id') {
        fieldType = 'id';
      }
      if (!this.getMetadata().get(['clientDefs', 'DynamicLogic', 'fieldTypes', fieldType])) {
        throw new Error();
      }
      const type = this.getMetadata().get(['clientDefs', 'DynamicLogic', 'fieldTypes', fieldType, 'typeList'])[0];
      const i = this.getIndexForNewItem();
      const key = this.getKey(i);
      this.addItemContainer(i);
      this.addViewDataListItem(i, key);
      this.createItemView(i, key, {
        data: {
          field: field,
          type: type
        }
      });
    }
    getIndexForNewItem() {
      if (!this.viewDataList.length) {
        return 0;
      }
      return this.viewDataList[this.viewDataList.length - 1].index + 1;
    }
    addViewDataListItem(i, key) {
      this.viewDataList.push({
        index: i,
        key: key
      });
    }
    addItemContainer(i) {
      const $item = $(`<div data-view-key="${this.getKey(i)}"></div>`);
      this.$el.find('> .item-list').append($item);
      const groupOperatorLabel = this.translate(this.getGroupOperator(), 'logicalOperators', 'Admin');
      const $operatorItem = $(`<div class="group-operator" data-view-ref-key="${this.getKey(i)}">${groupOperatorLabel}</div>`);
      this.$el.find('> .item-list').append($operatorItem);
    }
    actionAddGroup(operator) {
      const i = this.getIndexForNewItem();
      const key = this.getKey(i);
      this.addItemContainer(i);
      this.addViewDataListItem(i, key);
      this.createItemView(i, key, {
        type: operator,
        value: []
      });
    }
    afterRender() {
      this.controlAddItemVisibility();
    }
    controlAddItemVisibility() {}
  }
  _exports.default = DynamicLogicConditionGroupBaseView;
});

define("views/admin/dynamic-logic/conditions/field-types/link-multiple", ["exports", "views/admin/dynamic-logic/conditions/field-types/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class DynamicLogicConditionFieldTypeLinkMultipleView extends _base.default {
    getValueFieldName() {
      return this.name;
    }
    getValueViewName() {
      return 'views/fields/link';
    }

    // noinspection JSUnusedGlobalSymbols
    createValueViewContains() {
      this.createLinkValueField();
    }

    // noinspection JSUnusedGlobalSymbols
    createValueViewNotContains() {
      this.createLinkValueField();
    }
    createLinkValueField() {
      const viewName = 'views/fields/link';
      const fieldName = 'link';
      this.createView('value', viewName, {
        model: this.model,
        name: fieldName,
        selector: '.value-container',
        mode: 'edit',
        readOnlyDisabled: true,
        foreignScope: this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'entity']) || this.getMetadata().get(['entityDefs', this.scope, 'links', this.field, 'entity'])
      }, view => {
        if (this.isRendered()) {
          view.render();
        }
      });
    }
    fetch() {
      /** @type {import('views/fields/base').default} */
      const valueView = this.getView('value');
      const item = {
        type: this.type,
        attribute: this.field + 'Ids',
        data: {
          field: this.field
        }
      };
      if (valueView) {
        valueView.fetchToModel();
        item.value = this.model.get('linkId');
        const values = {};
        values['linkName'] = this.model.get('linkName');
        values['linkId'] = this.model.get('linkId');
        item.data.values = values;
      }
      return item;
    }
  }
  _exports.default = DynamicLogicConditionFieldTypeLinkMultipleView;
});

define("views/email-account/fields/test-send", ["exports", "views/outbound-email/fields/test-send"], function (_exports, _testSend) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _testSend = _interopRequireDefault(_testSend);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _testSend.default {
    checkAvailability() {
      if (this.model.get('smtpHost')) {
        this.$el.find('button').removeClass('hidden');
      } else {
        this.$el.find('button').addClass('hidden');
      }
    }
    afterRender() {
      this.checkAvailability();
      this.stopListening(this.model, 'change:smtpHost');
      this.listenTo(this.model, 'change:smtpHost', () => {
        this.checkAvailability();
      });
    }
    getSmtpData() {
      return {
        'server': this.model.get('smtpHost'),
        'port': this.model.get('smtpPort'),
        'auth': this.model.get('smtpAuth'),
        'security': this.model.get('smtpSecurity'),
        'username': this.model.get('smtpUsername'),
        'password': this.model.get('smtpPassword') || null,
        'authMechanism': this.model.get('smtpAuthMechanism'),
        'fromName': this.getUser().get('name'),
        'fromAddress': this.model.get('emailAddress'),
        'type': 'emailAccount',
        'id': this.model.id,
        'userId': this.model.get('assignedUserId')
      };
    }
  }
  _exports.default = _default;
});

define("views/email-account/fields/test-connection", ["exports", "views/fields/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    readOnly = true;
    templateContent = `
        <button class="btn btn-default disabled" data-action="testConnection"
        >{{translate 'Test Connection' scope='EmailAccount'}}</button>
    `;
    url = 'EmailAccount/action/testConnection';
    setup() {
      super.setup();
      this.addActionHandler('testConnection', () => this.test());
    }
    fetch() {
      return {};
    }
    checkAvailability() {
      if (this.model.get('host')) {
        this.$el.find('button').removeClass('disabled').removeAttr('disabled');
      } else {
        this.$el.find('button').addClass('disabled').attr('disabled', 'disabled');
      }
    }
    afterRender() {
      this.checkAvailability();
      this.stopListening(this.model, 'change:host');
      this.listenTo(this.model, 'change:host', () => {
        this.checkAvailability();
      });
    }
    getData() {
      return {
        host: this.model.get('host'),
        port: this.model.get('port'),
        security: this.model.get('security'),
        username: this.model.get('username'),
        password: this.model.get('password') || null,
        id: this.model.id,
        emailAddress: this.model.get('emailAddress'),
        userId: this.model.get('assignedUserId')
      };
    }
    test() {
      const data = this.getData();
      const $btn = this.$el.find('button');
      $btn.addClass('disabled');
      Espo.Ui.notify(this.translate('pleaseWait', 'messages'));
      Espo.Ajax.postRequest(this.url, data).then(() => {
        $btn.removeClass('disabled');
        Espo.Ui.success(this.translate('connectionIsOk', 'messages', 'EmailAccount'));
      }).catch(xhr => {
        let statusReason = xhr.getResponseHeader('X-Status-Reason') || '';
        statusReason = statusReason.replace(/ $/, '');
        statusReason = statusReason.replace(/,$/, '');
        let msg = this.translate('Error');
        if (parseInt(xhr.status) !== 200) {
          msg += ' ' + xhr.status;
        }
        if (statusReason) {
          msg += ': ' + statusReason;
        }
        Espo.Ui.error(msg, true);
        console.error(msg);
        xhr.errorIsHandled = true;
        $btn.removeClass('disabled');
      });
    }
  }
  _exports.default = _default;
});

define("views/email-account/fields/folders", ["exports", "views/fields/array"], function (_exports, _array) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _array = _interopRequireDefault(_array);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _array.default {
    getFoldersUrl = 'EmailAccount/action/getFolders';
    setupOptions() {
      this.params.options = ['INBOX'];
    }
    fetchFolders() {
      return new Promise(resolve => {
        const data = {
          host: this.model.get('host'),
          port: this.model.get('port'),
          security: this.model.get('security'),
          username: this.model.get('username'),
          emailAddress: this.model.get('emailAddress'),
          userId: this.model.get('assignedUserId')
        };
        if (this.model.has('password')) {
          data.password = this.model.get('password');
        }
        if (!this.model.isNew()) {
          data.id = this.model.id;
        }
        Espo.Ajax.postRequest(this.getFoldersUrl, data).then(folders => {
          resolve(folders);
        }).catch(xhr => {
          Espo.Ui.error(this.translate('couldNotConnectToImap', 'messages', 'EmailAccount'));
          xhr.errorIsHandled = true;
          resolve(["INBOX"]);
        });
      });
    }
    actionAddItem() {
      Espo.Ui.notify(' ... ');
      this.fetchFolders().then(options => {
        Espo.Ui.notify(false);
        this.createView('addModal', this.addItemModalView, {
          options: options
        }).then(view => {
          view.render();
          view.once('add', item => {
            this.addValue(item);
            view.close();
          });
          view.once('add-mass', items => {
            items.forEach(item => {
              this.addValue(item);
            });
            view.close();
          });
        });
      });
    }
  }
  _exports.default = _default;
});

define("views/email-account/fields/folder", ["exports", "views/fields/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    editTemplate = 'email-account/fields/folder/edit';
    getFoldersUrl = 'EmailAccount/action/getFolders';
    setup() {
      super.setup();
      this.addActionHandler('selectFolder', () => {
        Espo.Ui.notify(this.translate('pleaseWait', 'messages'));
        const data = {
          host: this.model.get('host'),
          port: this.model.get('port'),
          security: this.model.get('security'),
          username: this.model.get('username'),
          emailAddress: this.model.get('emailAddress'),
          userId: this.model.get('assignedUserId')
        };
        if (this.model.has('password')) {
          data.password = this.model.get('password');
        }
        if (!this.model.isNew()) {
          data.id = this.model.id;
        }
        Espo.Ajax.postRequest(this.getFoldersUrl, data).then(folders => {
          this.createView('modal', 'views/email-account/modals/select-folder', {
            folders: folders
          }, view => {
            Espo.Ui.notify(false);
            view.render();
            this.listenToOnce(view, 'select', folder => {
              view.close();
              this.addFolder(folder);
            });
          });
        }).catch(xhr => {
          Espo.Ui.error(this.translate('couldNotConnectToImap', 'messages', 'EmailAccount'));
          xhr.errorIsHandled = true;
        });
      });
    }
    addFolder(folder) {
      this.$element.val(folder);
    }
  }
  _exports.default = _default;
});

define("views/templates/event/record/detail", ["exports", "views/record/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    setup() {
      super.setup();
      if (this.getAcl().checkModel(this.model, 'edit')) {
        if (['Held', 'Not Held'].indexOf(this.model.get('status')) === -1) {
          this.dropdownItemList.push({
            html: this.translate('Set Held', 'labels', this.scope),
            name: 'setHeld',
            onClick: () => this.actionSetHeld()
          });
          this.dropdownItemList.push({
            html: this.translate('Set Not Held', 'labels', this.scope),
            name: 'setNotHeld',
            onClick: () => this.actionSetNotHeld()
          });
        }
      }
    }
    actionSetHeld() {
      this.model.save({
        status: 'Held'
      }, {
        patch: true
      }).then(() => {
        Espo.Ui.success(this.translate('Saved', 'labels', 'Meeting'));
        this.removeActionItem('setHeld');
        this.removeActionItem('setNotHeld');
      });
    }
    actionSetNotHeld() {
      this.model.save({
        status: 'Not Held'
      }, {
        patch: true
      }).then(() => {
        Espo.Ui.success(this.translate('Saved', 'labels', 'Meeting'));
        this.removeActionItem('setHeld');
        this.removeActionItem('setNotHeld');
      });
    }
  }
  _exports.default = _default;
});

define("views/settings/modals/tab-list-field-add", ["exports", "views/modals/array-field-add"], function (_exports, _arrayFieldAdd) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _arrayFieldAdd = _interopRequireDefault(_arrayFieldAdd);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class TabListFieldAddSettingsModalView extends _arrayFieldAdd.default {
    setup() {
      super.setup();
      if (!this.options.noGroups) {
        this.buttonList.push({
          name: 'addGroup',
          text: this.translate('Group Tab', 'labels', 'Settings'),
          onClick: () => this.actionAddGroup(),
          position: 'right',
          iconClass: 'fas fa-plus fa-sm'
        });
      }
      this.buttonList.push({
        name: 'addDivider',
        text: this.translate('Divider', 'labels', 'Settings'),
        onClick: () => this.actionAddDivider(),
        position: 'right',
        iconClass: 'fas fa-plus fa-sm'
      });
      this.addButton({
        name: 'addUrl',
        text: this.translate('URL', 'labels', 'Settings'),
        onClick: () => this.actionAddUrl(),
        position: 'right',
        iconClass: 'fas fa-plus fa-sm'
      });
    }
    actionAddGroup() {
      this.trigger('add', {
        type: 'group',
        text: this.translate('Group Tab', 'labels', 'Settings'),
        iconClass: null,
        color: null
      });
    }
    actionAddDivider() {
      this.trigger('add', {
        type: 'divider',
        text: null
      });
    }
    actionAddUrl() {
      this.trigger('add', {
        type: 'url',
        text: this.translate('URL', 'labels', 'Settings'),
        url: null,
        iconClass: null,
        color: null,
        aclScope: null,
        onlyAdmin: false
      });
    }
  }

  // noinspection JSUnusedGlobalSymbols
  var _default = _exports.default = TabListFieldAddSettingsModalView;
});

define("views/settings/modals/edit-tab-url", ["exports", "views/modal", "model"], function (_exports, _modal, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class SettingsEditTabUrlModalView extends _modal.default {
    className = 'dialog dialog-record';
    templateContent = `<div class="record no-side-margin">{{{record}}}</div>`;
    setup() {
      super.setup();
      this.headerText = this.translate('URL', 'labels', 'Settings');
      this.buttonList.push({
        name: 'apply',
        label: 'Apply',
        style: 'danger'
      });
      this.buttonList.push({
        name: 'cancel',
        label: 'Cancel'
      });
      this.shortcutKeys = {
        'Control+Enter': () => this.actionApply()
      };
      const detailLayout = [{
        rows: [[{
          name: 'url',
          labelText: this.translate('URL', 'labels', 'Settings'),
          view: 'views/settings/fields/tab-url'
        }], [{
          name: 'text',
          labelText: this.options.parentType === 'Preferences' ? this.translate('label', 'tabFields', 'Preferences') : this.translate('label', 'fields', 'Admin')
        }, {
          name: 'iconClass',
          labelText: this.options.parentType === 'Preferences' ? this.translate('iconClass', 'tabFields', 'Preferences') : this.translate('iconClass', 'fields', 'EntityManager')
        }, {
          name: 'color',
          labelText: this.options.parentType === 'Preferences' ? this.translate('color', 'tabFields', 'Preferences') : this.translate('color', 'fields', 'EntityManager')
        }], [{
          name: 'aclScope',
          labelText: this.translate('aclScope', 'fields', 'Admin')
        }, {
          name: 'onlyAdmin',
          labelText: this.translate('onlyAdmin', 'fields', 'Admin')
        }, false]]
      }];
      const model = this.model = new _model.default();
      model.set(this.options.itemData);
      model.setDefs({
        fields: {
          text: {
            type: 'varchar'
          },
          iconClass: {
            type: 'base',
            view: 'views/admin/entity-manager/fields/icon-class'
          },
          color: {
            type: 'base',
            view: 'views/fields/colorpicker'
          },
          url: {
            type: 'url',
            required: true
          },
          aclScope: {
            type: 'enum',
            translation: 'Global.scopeNames',
            options: ['', ...this.getAclScopes()]
          },
          onlyAdmin: {
            type: 'bool'
          }
        }
      });
      this.createView('record', 'views/record/edit-for-modal', {
        detailLayout: detailLayout,
        model: model,
        selector: '.record'
      }).then(/** import('views/record/edit').default */view => {
        if (this.options.parentType === 'Preferences') {
          view.hideField('aclScope');
          view.hideField('onlyAdmin');
        }
      });
    }
    actionApply() {
      const recordView = /** @type {import('views/record/edit').default} */this.getView('record');
      if (recordView.validate()) {
        return;
      }
      const data = recordView.fetch();
      this.trigger('apply', data);
    }

    /**
     * @return {string[]}
     */
    getAclScopes() {
      return this.getMetadata().getScopeList().filter(scope => {
        return this.getMetadata().get(`scopes.${scope}.acl`);
      });
    }
  }

  // noinspection JSUnusedGlobalSymbols
  var _default = _exports.default = SettingsEditTabUrlModalView;
});

define("views/settings/modals/edit-tab-group", ["exports", "views/modal", "model"], function (_exports, _modal, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class SettingsEditTabGroupModalView extends _modal.default {
    className = 'dialog dialog-record';
    templateContent = `<div class="record no-side-margin">{{{record}}}</div>`;
    setup() {
      super.setup();
      this.headerText = this.translate('Group Tab', 'labels', 'Settings');
      this.buttonList.push({
        name: 'apply',
        label: 'Apply',
        style: 'danger'
      });
      this.buttonList.push({
        name: 'cancel',
        label: 'Cancel'
      });
      this.shortcutKeys = {
        'Control+Enter': () => this.actionApply()
      };
      const detailLayout = [{
        rows: [[{
          name: 'text',
          labelText: this.options.parentType === 'Preferences' ? this.translate('label', 'tabFields', 'Preferences') : this.translate('label', 'fields', 'Admin')
        }, {
          name: 'iconClass',
          labelText: this.options.parentType === 'Preferences' ? this.translate('iconClass', 'tabFields', 'Preferences') : this.translate('iconClass', 'fields', 'EntityManager')
        }, {
          name: 'color',
          labelText: this.options.parentType === 'Preferences' ? this.translate('color', 'tabFields', 'Preferences') : this.translate('color', 'fields', 'EntityManager')
        }], [{
          name: 'itemList',
          labelText: this.options.parentType === 'Preferences' ? this.translate('tabList', 'fields', 'Preferences') : this.translate('tabList', 'fields', 'Settings')
        }, false]]
      }];
      const model = this.model = new _model.default();
      model.name = 'GroupTab';
      model.set(this.options.itemData);
      model.setDefs({
        fields: {
          text: {
            type: 'varchar'
          },
          iconClass: {
            type: 'base',
            view: 'views/admin/entity-manager/fields/icon-class'
          },
          color: {
            type: 'base',
            view: 'views/fields/colorpicker'
          },
          itemList: {
            type: 'array',
            view: 'views/settings/fields/group-tab-list'
          }
        }
      });
      this.createView('record', 'views/record/edit-for-modal', {
        detailLayout: detailLayout,
        model: model,
        selector: '.record'
      });
    }
    actionApply() {
      const recordView = /** @type {import('views/record/edit').default} */this.getView('record');
      if (recordView.validate()) {
        return;
      }
      const data = recordView.fetch();
      this.trigger('apply', data);
    }
  }
  var _default = _exports.default = SettingsEditTabGroupModalView;
});

define("views/settings/modals/edit-tab-divider", ["exports", "views/modal", "model"], function (_exports, _modal, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class EditTabDividerSettingsModalView extends _modal.default {
    className = 'dialog dialog-record';
    templateContent = '<div class="record no-side-margin">{{{record}}}</div>';
    setup() {
      super.setup();
      this.headerText = this.translate('Divider', 'labels', 'Settings');
      this.buttonList.push({
        name: 'apply',
        label: 'Apply',
        style: 'danger'
      });
      this.buttonList.push({
        name: 'cancel',
        label: 'Cancel'
      });
      this.shortcutKeys = {
        'Control+Enter': () => this.actionApply()
      };
      let detailLayout = [{
        rows: [[{
          name: 'text',
          labelText: this.options.parentType === 'Preferences' ? this.translate('label', 'tabFields', 'Preferences') : this.translate('label', 'fields', 'Admin')
        }, false]]
      }];
      let model = this.model = new _model.default({}, {
        entityType: 'Dummy'
      });
      model.set(this.options.itemData);
      model.setDefs({
        fields: {
          text: {
            type: 'varchar'
          }
        }
      });
      this.createView('record', 'views/record/edit-for-modal', {
        detailLayout: detailLayout,
        model: model,
        selector: '.record'
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionApply() {
      let recordView = /** @type {module:views/record/edit}*/this.getView('record');
      if (recordView.validate()) {
        return;
      }
      let data = recordView.fetch();
      this.trigger('apply', data);
    }
  }

  // noinspection JSUnusedGlobalSymbols
  var _default = _exports.default = EditTabDividerSettingsModalView;
});

define("views/settings/fields/time-format", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setupOptions() {
      this.params.options = this.getMetadata().get(['app', 'dateTime', 'timeFormatList']) || [];
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/thousand-separator", ["exports", "views/fields/varchar"], function (_exports, _varchar) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _varchar = _interopRequireDefault(_varchar);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _varchar.default {
    validations = ['required', 'thousandSeparator'];

    // noinspection JSUnusedGlobalSymbols
    validateThousandSeparator() {
      if (this.model.get('thousandSeparator') === this.model.get('decimalMark')) {
        const msg = this.translate('thousandSeparatorEqualsDecimalMark', 'messages', 'Admin');
        this.showValidationMessage(msg);
        return true;
      }
    }
    fetch() {
      const data = {};
      const value = this.$element.val();
      data[this.name] = value || '';
      return data;
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/tab-url", ["exports", "views/fields/url"], function (_exports, _url) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _url = _interopRequireDefault(_url);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class SettingsTabUrlFieldView extends _url.default {
    optionalProtocol = false;
    validateValid() {
      const value = /** @type {string|null} */this.model.get(this.name);
      if (value && value.startsWith('#')) {
        return false;
      }
      return super.validateValid();
    }
  }
  var _default = _exports.default = SettingsTabUrlFieldView;
});

define("views/settings/fields/stream-email-with-content-entity-type-list", ["exports", "views/fields/entity-type-list"], function (_exports, _entityTypeList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _entityTypeList = _interopRequireDefault(_entityTypeList);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _entityTypeList.default {
    setupOptions() {
      super.setupOptions();
      this.params.options = this.params.options.filter(scope => {
        /** @type {Record} */
        const defs = this.getMetadata().get(`scopes.${scope}`) || {};
        return defs.entity && defs.stream;
      });
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/stream-email-notifications-entity-list", ["exports", "views/fields/entity-type-list"], function (_exports, _entityTypeList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _entityTypeList = _interopRequireDefault(_entityTypeList);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _entityTypeList.default {
    setupOptions() {
      super.setupOptions();
      this.params.options = this.params.options.filter(scope => {
        if (this.getMetadata().get(`scopes.${scope}.disabled`)) return;
        if (!this.getMetadata().get(`scopes.${scope}.object`)) return;
        if (!this.getMetadata().get(`scopes.${scope}.stream`)) return;
        return true;
      });
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/sms-provider", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    fetchEmptyValueAsNull = true;
    setupOptions() {
      this.params.options = Object.keys(this.getMetadata().get(['app', 'smsProviders']) || {});
      this.params.options.unshift('');
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/phone-number-preferred-country-list", ["exports", "views/fields/multi-enum", "intl-tel-input-globals"], function (_exports, _multiEnum, _intlTelInputGlobals) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  _intlTelInputGlobals = _interopRequireDefault(_intlTelInputGlobals);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection NpmUsedModulesInstalled

  class SettingsPhoneNumberPreferredCountryListFieldView extends _multiEnum.default {
    setupOptions() {
      try {
        const dataList = _intlTelInputGlobals.default.getCountryData();
        this.params.options = dataList.map(item => item.iso2);
        this.translatedOptions = dataList.reduce((map, item) => {
          map[item.iso2] = `${item.iso2.toUpperCase()} +${item.dialCode}`;
          return map;
        }, {});
      } catch (e) {
        console.error(e);
      }
    }
  }

  // noinspection JSUnusedGlobalSymbols
  var _default = _exports.default = SettingsPhoneNumberPreferredCountryListFieldView;
});

define("views/settings/fields/pdf-engine", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _enum.default {
    setupOptions() {
      this.params.options = Object.keys(this.getMetadata().get(['app', 'pdfEngines']));
      if (this.params.options.length === 0) {
        this.params.options = [''];
      }
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/outbound-email-from-address", ["exports", "views/fields/email-address"], function (_exports, _emailAddress) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _emailAddress = _interopRequireDefault(_emailAddress);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class SettingsOutboundEmailFromAddressFieldView extends _emailAddress.default {
    useAutocompleteUrl = true;
    getAutocompleteUrl(q) {
      return 'InboundEmail?searchParams=' + JSON.stringify({
        select: ['emailAddress'],
        maxSize: 7,
        where: [{
          type: 'startsWith',
          attribute: 'emailAddress',
          value: q
        }, {
          type: 'isTrue',
          attribute: 'useSmtp'
        }]
      });
    }
    transformAutocompleteResult(list) {
      const result = super.transformAutocompleteResult(list);
      result.forEach(item => {
        item.value = item.attributes.emailAddress;
      });
      return result;
    }
  }
  var _default = _exports.default = SettingsOutboundEmailFromAddressFieldView;
});

define("views/settings/fields/oidc-teams", ["exports", "views/fields/link-multiple-with-role"], function (_exports, _linkMultipleWithRole) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _linkMultipleWithRole = _interopRequireDefault(_linkMultipleWithRole);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _linkMultipleWithRole.default {
    forceRoles = true;
    roleType = 'varchar';
    columnName = 'group';
    roleMaxLength = 255;
    setup() {
      super.setup();
      this.rolePlaceholderText = this.translate('IdP Group', 'labels', 'Settings');
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/oidc-redirect-uri", ["exports", "views/fields/varchar"], function (_exports, _varchar) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _varchar = _interopRequireDefault(_varchar);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _varchar.default {
    detailTemplateContent = `
        {{#if isNotEmpty}}
            <a
                role="button"
                data-action="copyToClipboard"
                class="pull-right text-soft"
                title="{{translate 'Copy to Clipboard'}}"
            ><span class="far fa-copy"></span></a>
            {{value}}
        {{else}}
            <span class="none-value">{{translate 'None'}}</span>
        {{/if}}
    `;
    portalCollection = null;
    data() {
      const isNotEmpty = this.model.entityType !== 'AuthenticationProvider' || this.portalCollection;
      return {
        value: this.getValueForDisplay(),
        isNotEmpty: isNotEmpty
      };
    }

    /**
     * @protected
     */
    copyToClipboard() {
      const value = this.getValueForDisplay();
      navigator.clipboard.writeText(value).then(() => {
        Espo.Ui.success(this.translate('Copied to clipboard'));
      });
    }
    getValueForDisplay() {
      if (this.model.entityType === 'AuthenticationProvider') {
        if (!this.portalCollection) {
          return null;
        }
        return this.portalCollection.models.map(model => {
          const file = 'oauth-callback.php';
          const url = (model.get('url') || '').replace(/\/+$/, '') + `/${file}`;
          const checkPart = `/portal/${model.id}/${file}`;
          if (!url.endsWith(checkPart)) {
            return url;
          }
          return url.slice(0, -checkPart.length) + `/portal/${file}`;
        }).join('\n');
      }
      const siteUrl = (this.getConfig().get('siteUrl') || '').replace(/\/+$/, '');
      return siteUrl + '/oauth-callback.php';
    }
    setup() {
      super.setup();
      if (this.model.entityType === 'AuthenticationProvider') {
        this.getCollectionFactory().create('Portal').then(collection => {
          collection.data.select = ['url', 'isDefault'].join(',');
          collection.fetch().then(() => {
            this.portalCollection = collection;
            this.reRender();
          });
        });
      }
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/language", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setupOptions() {
      this.params.options = Espo.Utils.clone(this.getMetadata().get(['app', 'language', 'list']) || []);
      this.translatedOptions = Espo.Utils.clone(this.getLanguage().translate('language', 'options') || {});
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/history-entity-list", ["exports", "views/fields/entity-type-list"], function (_exports, _entityTypeList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _entityTypeList = _interopRequireDefault(_entityTypeList);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _entityTypeList.default {
    setupOptions() {
      super.setupOptions();
      this.params.options = this.params.options.filter(scope => {
        if (this.getMetadata().get('scopes.' + scope + '.disabled')) return;
        if (!this.getMetadata().get('scopes.' + scope + '.object')) return;
        if (!this.getMetadata().get('scopes.' + scope + '.activity')) return;
        return true;
      });
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/group-tab-list", ["exports", "views/settings/fields/tab-list"], function (_exports, _tabList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _tabList = _interopRequireDefault(_tabList);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _tabList.default {
    noGroups = true;
    noDelimiters = true;
  }
  _exports.default = _default;
});

define("views/settings/fields/global-search-entity-list", ["exports", "views/fields/multi-enum"], function (_exports, _multiEnum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _multiEnum.default {
    setup() {
      this.params.options = Object.keys(this.getMetadata().get('scopes')).filter(scope => {
        const defs = this.getMetadata().get(['scopes', scope]) || {};
        if (defs.disabled || scope === 'Note') {
          return;
        }
        return defs.customizable && defs.entity;
      }).sort((v1, v2) => {
        return this.translate(v1, 'scopeNamesPlural').localeCompare(this.translate(v2, 'scopeNamesPlural'));
      });
      super.setup();
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/fiscal-year-shift", ["exports", "views/fields/enum-int"], function (_exports, _enumInt) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enumInt = _interopRequireDefault(_enumInt);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _enumInt.default {
    setupOptions() {
      this.params.options = [];
      this.translatedOptions = {};
      const monthNameList = this.getLanguage().get('Global', 'lists', 'monthNames') || [];
      monthNameList.forEach((name, i) => {
        this.params.options.push(i);
        this.translatedOptions[i] = name;
      });
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/email-address-lookup-entity-type-list", ["exports", "views/fields/entity-type-list"], function (_exports, _entityTypeList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _entityTypeList = _interopRequireDefault(_entityTypeList);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _entityTypeList.default {
    setupOptions() {
      super.setupOptions();
      this.params.options = this.params.options.filter(scope => {
        if (this.getMetadata().get(['scopes', scope, 'disabled'])) {
          return;
        }
        if (!this.getMetadata().get(['scopes', scope, 'object'])) {
          return;
        }
        if (['User', 'Contact', 'Lead', 'Account'].includes(scope)) {
          return true;
        }
        const type = this.getMetadata().get(['scopes', scope, 'type']);
        if (type === 'Company' || type === 'Person') {
          return true;
        }
      });
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/default-currency", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setup() {
      super.setup();
      this.validations.push(() => this.validateExisting());
    }
    setupOptions() {
      this.params.options = Espo.Utils.clone(this.getConfig().get('currencyList') || []);
    }
    validateExisting() {
      /** @type {string[]} */
      const currencyList = this.model.get('currencyList');
      if (!currencyList) {
        return false;
      }
      const value = this.model.get(this.name);
      if (currencyList.includes(value)) {
        return false;
      }
      const msg = this.translate('fieldInvalid', 'messages').replace('{field}', this.getLabelText());
      this.showValidationMessage(msg);
      return true;
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/date-format", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setupOptions() {
      this.params.options = this.getMetadata().get(['app', 'dateTime', 'dateFormatList']) || [];
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/dashboard-layout", ["exports", "views/fields/base", "gridstack"], function (_exports, _base, _gridstack) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  _gridstack = _interopRequireDefault(_gridstack);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class SettingsDashboardLayoutFieldView extends _base.default {
    detailTemplate = 'settings/fields/dashboard-layout/detail';
    editTemplate = 'settings/fields/dashboard-layout/edit';
    validationElementSelector = 'button[data-action="addDashlet"]';
    WIDTH_MULTIPLIER = 3;
    HEIGHT_MULTIPLIER = 4;
    data() {
      return {
        dashboardLayout: this.dashboardLayout,
        currentTab: this.currentTab,
        isEmpty: this.isEmpty()
      };
    }

    /**
     * @protected
     * @return {boolean}
     */
    hasLocked() {
      return this.model.entityType === 'Preferences';
    }
    setup() {
      this.addActionHandler('selectTab', (e, target) => {
        const tab = parseInt(target.dataset.tab);
        this.selectTab(tab);
      });
      this.addActionHandler('removeDashlet', (e, target) => {
        const id = target.dataset.id;
        this.removeDashlet(id);
      });
      this.addActionHandler('editDashlet', (e, target) => {
        const id = target.dataset.id;
        const name = target.dataset.name;
        this.editDashlet(id, name);
      });
      this.addActionHandler('editTabs', () => this.editTabs());
      this.addActionHandler('addDashlet', () => {
        this.createView('addDashlet', 'views/modals/add-dashlet', {
          parentType: this.model.entityType
        }, view => {
          view.render();
          this.listenToOnce(view, 'add', name => this.addDashlet(name));
        });
      });
      this.dashboardLayout = Espo.Utils.cloneDeep(this.model.get(this.name) || []);
      this.dashletsOptions = Espo.Utils.cloneDeep(this.model.get('dashletsOptions') || {});
      if (this.hasLocked()) {
        this.dashboardLocked = this.model.get('dashboardLocked') || false;
      }
      this.listenTo(this.model, 'change', () => {
        if (this.model.hasChanged(this.name)) {
          this.dashboardLayout = Espo.Utils.cloneDeep(this.model.get(this.name) || []);
        }
        if (this.model.hasChanged('dashletsOptions')) {
          this.dashletsOptions = Espo.Utils.cloneDeep(this.model.get('dashletsOptions') || {});
        }
        if (this.model.hasChanged(this.name)) {
          if (this.dashboardLayout.length) {
            if (this.isDetailMode()) {
              this.selectTab(0);
            }
          }
        }
        if (this.hasLocked()) {
          this.dashboardLocked = this.model.get('dashboardLocked') || false;
        }
      });
      this.currentTab = -1;
      this.currentTabLayout = null;
      if (this.dashboardLayout.length) {
        this.selectTab(0);
      }
    }

    /**
     * @protected
     * @param {number} tab
     */
    selectTab(tab) {
      this.currentTab = tab;
      this.setupCurrentTabLayout();
      if (this.isRendered()) {
        this.reRender().then(() => {
          this.$el.find(`[data-action="selectTab"][data-tab="${tab}"]`).focus();
        });
      }
    }

    /**
     * @protected
     */
    setupCurrentTabLayout() {
      if (!~this.currentTab) {
        this.currentTabLayout = null;
      }
      let tabLayout = this.dashboardLayout[this.currentTab].layout || [];
      tabLayout = _gridstack.default.Utils.sort(tabLayout);
      this.currentTabLayout = tabLayout;
    }

    /**
     * @protected
     * @param {string} id
     * @param {string} name
     */
    addDashletHtml(id, name) {
      const $item = this.prepareGridstackItem(id, name);
      this.grid.addWidget($item.get(0), {
        x: 0,
        y: 0,
        w: 2 * this.WIDTH_MULTIPLIER,
        h: 2 * this.HEIGHT_MULTIPLIER
      });
    }

    /**
     * @private
     * @return {string}
     */
    generateId() {
      return Math.floor(Math.random() * 10000001).toString();
    }

    /**
     * @protected
     * @param {string} name
     */
    addDashlet(name) {
      const id = 'd' + Math.floor(Math.random() * 1000001).toString();
      if (!~this.currentTab) {
        this.dashboardLayout.push({
          name: 'My Espo',
          layout: [],
          id: this.generateId()
        });
        this.currentTab = 0;
        this.setupCurrentTabLayout();
        this.once('after:render', () => {
          setTimeout(() => {
            this.addDashletHtml(id, name);
            this.fetchLayout();
          }, 50);
        });
        this.reRender();
      } else {
        this.addDashletHtml(id, name);
        this.fetchLayout();
      }
    }

    /**
     * @protected
     * @param {string} id
     */
    removeDashlet(id) {
      const $item = this.$gridstack.find('.grid-stack-item[data-id="' + id + '"]');
      this.grid.removeWidget($item.get(0), true);
      const layout = this.dashboardLayout[this.currentTab].layout;
      layout.forEach((o, i) => {
        if (o.id === id) {
          layout.splice(i, 1);
        }
      });
      delete this.dashletsOptions[id];
      this.setupCurrentTabLayout();
    }

    /**
     * @protected
     */
    editTabs() {
      const options = {
        dashboardLayout: this.dashboardLayout,
        tabListIsNotRequired: true
      };
      if (this.hasLocked()) {
        options.dashboardLocked = this.dashboardLocked;
      }
      this.createView('editTabs', 'views/modals/edit-dashboard', options, view => {
        view.render();
        this.listenToOnce(view, 'after:save', data => {
          view.close();
          const dashboardLayout = [];
          data.dashboardTabList.forEach(name => {
            let layout = [];
            let id = this.generateId();
            this.dashboardLayout.forEach(d => {
              if (d.name === name) {
                layout = d.layout;
                id = d.id;
              }
            });
            if (name in data.renameMap) {
              name = data.renameMap[name];
            }
            dashboardLayout.push({
              name: name,
              layout: layout,
              id: id
            });
          });
          this.dashboardLayout = dashboardLayout;
          if (this.hasLocked()) {
            this.dashboardLocked = data.dashboardLocked;
          }
          this.selectTab(0);
          this.deleteNotExistingDashletsOptions();
        });
      });
    }

    /**
     * @private
     */
    deleteNotExistingDashletsOptions() {
      const idListMet = [];
      (this.dashboardLayout || []).forEach(itemTab => {
        (itemTab.layout || []).forEach(item => {
          idListMet.push(item.id);
        });
      });
      Object.keys(this.dashletsOptions).forEach(id => {
        if (!~idListMet.indexOf(id)) {
          delete this.dashletsOptions[id];
        }
      });
    }

    /**
     * @protected
     * @param {string} id
     * @param {string} name
     */
    editDashlet(id, name) {
      let options = this.dashletsOptions[id] || {};
      options = Espo.Utils.cloneDeep(options);
      const defaultOptions = this.getMetadata().get(['dashlets', name, 'options', 'defaults']) || {};
      Object.keys(defaultOptions).forEach(item => {
        if (item in options) {
          return;
        }
        options[item] = Espo.Utils.cloneDeep(defaultOptions[item]);
      });
      if (!('title' in options)) {
        options.title = this.translate(name, 'dashlets');
      }
      const optionsView = this.getMetadata().get(['dashlets', name, 'options', 'view']) || 'views/dashlets/options/base';
      this.createView('options', optionsView, {
        name: name,
        optionsData: options,
        fields: this.getMetadata().get(['dashlets', name, 'options', 'fields']) || {},
        userId: this.model.entityType === 'Preferences' ? this.model.id : null
      }, view => {
        view.render();
        this.listenToOnce(view, 'save', attributes => {
          this.dashletsOptions[id] = attributes;
          view.close();
          if ('title' in attributes) {
            let title = attributes.title;
            if (!title) {
              title = this.translate(name, 'dashlets');
            }
            this.$el.find('[data-id="' + id + '"] .panel-title').text(title);
          }
        });
      });
    }

    /**
     * @protected
     */
    fetchLayout() {
      if (!~this.currentTab) {
        return;
      }
      this.dashboardLayout[this.currentTab].layout = _.map(this.$gridstack.find('.grid-stack-item'), el => {
        const $el = $(el);
        const x = $el.attr('gs-x');
        const y = $el.attr('gs-y');
        const h = $el.attr('gs-h');
        const w = $el.attr('gs-w');
        return {
          id: $el.data('id'),
          name: $el.data('name'),
          x: x / this.WIDTH_MULTIPLIER,
          y: y / this.HEIGHT_MULTIPLIER,
          width: w / this.WIDTH_MULTIPLIER,
          height: h / this.HEIGHT_MULTIPLIER
        };
      });
      this.setupCurrentTabLayout();
    }
    afterRender() {
      if (this.currentTabLayout) {
        const $gridstack = this.$gridstack = this.$el.find('> .grid-stack');
        const grid = this.grid = _gridstack.default.init({
          minWidth: 4,
          cellHeight: 20,
          margin: 10,
          column: 12,
          resizable: {
            handles: 'se',
            helper: false
          },
          disableOneColumnMode: true,
          animate: false,
          staticGrid: this.mode !== 'edit',
          disableResize: this.mode !== 'edit',
          disableDrag: this.mode !== 'edit'
        });
        grid.removeAll();
        this.currentTabLayout.forEach(o => {
          const $item = this.prepareGridstackItem(o.id, o.name);
          this.grid.addWidget($item.get(0), {
            x: o.x * this.WIDTH_MULTIPLIER,
            y: o.y * this.HEIGHT_MULTIPLIER,
            w: o.width * this.WIDTH_MULTIPLIER,
            h: o.height * this.HEIGHT_MULTIPLIER
          });
        });
        $gridstack.find(' .grid-stack-item').css('position', 'absolute');
        $gridstack.on('change', () => {
          this.fetchLayout();
          this.trigger('change');
        });
      }
    }

    /**
     * @private
     * @param {string} id
     * @param {string} name
     * @return {jQuery|JQuery}
     */
    prepareGridstackItem(id, name) {
      const $item = $('<div>').addClass('grid-stack-item');
      let actionsHtml = '';
      if (this.isEditMode()) {
        actionsHtml += $('<div>').addClass('btn-group pull-right').append($('<button>').addClass('btn btn-default').attr('data-action', 'removeDashlet').attr('data-id', id).attr('title', this.translate('Remove')).append($('<span>').addClass('fas fa-times'))).get(0).outerHTML;
        actionsHtml += $('<div>').addClass('btn-group pull-right').append($('<button>').addClass('btn btn-default').attr('data-action', 'editDashlet').attr('data-id', id).attr('data-name', name).attr('title', this.translate('Edit')).append($('<span>').addClass('fas fa-pencil-alt fa-sm').css({
          position: 'relative',
          top: '-1px'
        }))).get(0).outerHTML;
      }
      let title = this.getOption(id, 'title');
      if (!title) {
        title = this.translate(name, 'dashlets');
      }
      const headerHtml = $('<div>').addClass('panel-heading').append(actionsHtml).append($('<h4>').addClass('panel-title').text(title)).get(0).outerHTML;
      const $container = $('<div>').addClass('grid-stack-item-content panel panel-default').append(headerHtml);
      $container.attr('data-id', id);
      $container.attr('data-name', name);
      $item.attr('data-id', id);
      $item.attr('data-name', name);
      $item.append($container);
      return $item;
    }

    /**
     * @param {string} id
     * @param {string} optionName
     * @return {*}
     */
    getOption(id, optionName) {
      const options = (this.model.get('dashletsOptions') || {})[id] || {};
      return options[optionName];
    }

    /**
     * @protected
     * @return {boolean}
     */
    isEmpty() {
      let isEmpty = true;
      if (this.dashboardLayout && this.dashboardLayout.length) {
        this.dashboardLayout.forEach(item => {
          if (item.layout && item.layout.length) {
            isEmpty = false;
          }
        });
      }
      return isEmpty;
    }
    validateRequired() {
      if (!this.isRequired()) {
        return;
      }
      if (this.isEmpty()) {
        const msg = this.translate('fieldIsRequired', 'messages').replace('{field}', this.getLabelText());
        this.showValidationMessage(msg);
        return true;
      }
    }
    fetch() {
      const data = {};
      if (!this.dashboardLayout || !this.dashboardLayout.length) {
        data[this.name] = null;
        data['dashletsOptions'] = {};
        return data;
      }
      data[this.name] = Espo.Utils.cloneDeep(this.dashboardLayout);
      data.dashletsOptions = Espo.Utils.cloneDeep(this.dashletsOptions);
      if (this.hasLocked()) {
        data.dashboardLocked = this.dashboardLocked;
      }
      return data;
    }
  }
  _exports.default = SettingsDashboardLayoutFieldView;
});

define("views/settings/fields/currency-rates", ["exports", "views/fields/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    editTemplate = 'settings/fields/currency-rates/edit';
    data() {
      const baseCurrency = this.model.get('baseCurrency');
      const currencyRates = this.model.get('currencyRates') || {};
      const rateValues = {};
      (this.model.get('currencyList') || []).forEach(currency => {
        if (currency !== baseCurrency) {
          rateValues[currency] = currencyRates[currency];
          if (!rateValues[currency]) {
            if (currencyRates[baseCurrency]) {
              rateValues[currency] = Math.round(1 / currencyRates[baseCurrency] * 1000) / 1000;
            }
            if (!rateValues[currency]) {
              rateValues[currency] = 1.00;
            }
          }
        }
      });
      return {
        rateValues: rateValues,
        baseCurrency: baseCurrency
      };
    }
    fetch() {
      const data = {};
      const currencyRates = {};
      const baseCurrency = this.model.get('baseCurrency');
      const currencyList = this.model.get('currencyList') || [];
      currencyList.forEach(currency => {
        if (currency !== baseCurrency) {
          const value = this.$el.find(`input[data-currency="${currency}"]`).val() || '1';
          currencyRates[currency] = parseFloat(value);
        }
      });
      delete currencyRates[baseCurrency];
      for (const c in currencyRates) {
        if (!~currencyList.indexOf(c)) {
          delete currencyRates[c];
        }
      }
      data[this.name] = currencyRates;
      return data;
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/currency-list", ["exports", "views/fields/multi-enum"], function (_exports, _multiEnum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _multiEnum.default {
    matchAnyWord = true;
    setupOptions() {
      this.params.options = this.getMetadata().get(['app', 'currency', 'list']) || [];
      this.translatedOptions = {};
      this.params.options.forEach(item => {
        let value = item;
        const name = this.getLanguage().get('Currency', 'names', item);
        if (name) {
          value += ' - ' + name;
        }
        this.translatedOptions[item] = value;
      });
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/calendar-entity-list", ["exports", "views/fields/entity-type-list"], function (_exports, _entityTypeList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _entityTypeList = _interopRequireDefault(_entityTypeList);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _entityTypeList.default {
    setupOptions() {
      super.setupOptions();
      this.params.options = this.params.options.filter(scope => {
        if (this.getMetadata().get(`scopes.${scope}.disabled`)) return;
        if (!this.getMetadata().get(`scopes.${scope}.object`)) return;
        if (!this.getMetadata().get(`scopes.${scope}.calendar`)) return;
        return true;
      });
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/busy-ranges-entity-list", ["exports", "views/fields/entity-type-list"], function (_exports, _entityTypeList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _entityTypeList = _interopRequireDefault(_entityTypeList);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _entityTypeList.default {
    setupOptions() {
      super.setupOptions();
      this.params.options = this.params.options.filter(scope => {
        if (this.getMetadata().get(['scopes', scope, 'disabled'])) {
          return;
        }
        if (!this.getMetadata().get(['scopes', scope, 'object'])) {
          return;
        }
        if (!this.getMetadata().get(['scopes', scope, 'calendar'])) {
          return;
        }
        return true;
      });
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/available-reactions", ["exports", "views/fields/array", "helpers/misc/reactions"], function (_exports, _array, _reactions) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _array = _interopRequireDefault(_array);
  _reactions = _interopRequireDefault(_reactions);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _array.default {
    /**
     * @type {Object.<string, string>}
     * @private
     */
    iconClassMap;

    /**
     * @private
     * @type {ReactionsHelper}
     */
    reactionsHelper;
    setup() {
      this.reactionsHelper = new _reactions.default();
      this.iconClassMap = this.reactionsHelper.getDefinitionList().reduce((o, it) => {
        return {
          [it.type]: it.iconClass,
          ...o
        };
      }, {});
      super.setup();
    }
    setupOptions() {
      const list = this.reactionsHelper.getDefinitionList();
      this.params.options = list.map(it => it.type);
      this.translatedOptions = list.reduce((o, it) => {
        return {
          [it.type]: this.translate(it.type, 'reactions'),
          ...o
        };
      }, {});
    }

    /**
     * @param {string} value
     * @return {string}
     */
    getItemHtml(value) {
      const html = super.getItemHtml(value);
      const item = /** @type {HTMLElement} */
      new DOMParser().parseFromString(html, 'text/html').body.childNodes[0];
      const icon = this.createIconElement(value);
      item.prepend(icon);
      return item.outerHTML;
    }

    /**
     * @private
     * @param {string} value
     * @return {HTMLSpanElement}
     */
    createIconElement(value) {
      const icon = document.createElement('span');
      (this.iconClassMap[value] || '').split(' ').filter(it => it).forEach(it => icon.classList.add(it));
      icon.classList.add('text-soft');
      icon.style.display = 'inline-block';
      icon.style.width = 'var(--24px)';
      return icon;
    }

    /**
     * @inheritDoc
     */
    async actionAddItem() {
      const view = await super.actionAddItem();
      view.whenRendered().then(() => {
        const anchors = /** @type {HTMLAnchorElement[]} */
        view.element.querySelectorAll(`a[data-value]`);
        anchors.forEach(a => {
          const icon = this.createIconElement(a.dataset.value);
          a.prepend(icon);
        });
      });
      return view;
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/authentication-method", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setupOptions() {
      this.params.options = [];
      const defs = this.getMetadata().get(['authenticationMethods']) || {};
      for (const method in defs) {
        if (defs[method].settings && defs[method].settings.isAvailable) {
          this.params.options.push(method);
        }
      }
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/auth-two-fa-method-list", ["exports", "views/fields/multi-enum"], function (_exports, _multiEnum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _multiEnum.default {
    setupOptions() {
      this.params.options = [];
      const defs = this.getMetadata().get(['app', 'authentication2FAMethods']) || {};
      for (const method in defs) {
        if (defs[method].settings && defs[method].settings.isAvailable) {
          this.params.options.push(method);
        }
      }
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/assignment-notifications-entity-list", ["exports", "views/fields/multi-enum"], function (_exports, _multiEnum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _multiEnum.default {
    setup() {
      this.params.options = Object.keys(this.getMetadata().get('scopes')).filter(scope => {
        if (this.getMetadata().get(`scopes.${scope}.disabled`)) {
          return;
        }
        if (this.getMetadata().get(`scopes.${scope}.stream`) && !this.getMetadata().get(`notificationDefs.${scope}.forceAssignmentNotificator`)) {
          return;
        }
        return this.getMetadata().get(`scopes.${scope}.notifications`) && this.getMetadata().get(`scopes.${scope}.entity`);
      }).sort((v1, v2) => {
        return this.translate(v1, 'scopeNamesPlural').localeCompare(this.translate(v2, 'scopeNamesPlural'));
      });
      super.setup();
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/assignment-email-notifications-entity-list", ["exports", "views/fields/multi-enum"], function (_exports, _multiEnum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _multiEnum.default {
    setup() {
      this.params.options = Object.keys(this.getMetadata().get('scopes')).filter(scope => {
        if (scope === 'Email') {
          return;
        }
        if (this.getMetadata().get(`scopes.${scope}.disabled`)) {
          return;
        }
        return this.getMetadata().get(`scopes.${scope}.notifications`) && this.getMetadata().get(`scopes.${scope}.entity`);
      }).sort((v1, v2) => {
        return this.translate(v1, 'scopeNamesPlural').localeCompare(this.translate(v2, 'scopeNamesPlural'));
      });
      super.setup();
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/address-preview", ["exports", "views/fields/address"], function (_exports, _address) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _address = _interopRequireDefault(_address);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _address.default {
    setup() {
      super.setup();
      const mainModel = this.model;
      const model = mainModel.clone();
      model.entityType = mainModel.entityType;
      model.name = mainModel.name;
      model.set({
        addressPreviewStreet: 'Street',
        addressPreviewPostalCode: 'PostalCode',
        addressPreviewCity: 'City',
        addressPreviewState: 'State',
        addressPreviewCountry: 'Country'
      });
      this.listenTo(mainModel, 'change:addressFormat', () => {
        model.set('addressFormat', mainModel.get('addressFormat'));
        this.reRender();
      });
      this.model = model;
    }
    getAddressFormat() {
      return this.model.get('addressFormat') || 1;
    }
  }
  _exports.default = _default;
});

define("views/settings/fields/activities-entity-list", ["exports", "views/fields/entity-type-list"], function (_exports, _entityTypeList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _entityTypeList = _interopRequireDefault(_entityTypeList);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _entityTypeList.default {
    setupOptions() {
      super.setupOptions();
      this.params.options = this.params.options.filter(scope => {
        if (scope === 'Email') {
          return;
        }
        if (this.getMetadata().get(`scopes.${scope}.disabled`) || !this.getMetadata().get(`scopes.${scope}.object`) || !this.getMetadata().get(`scopes.${scope}.activity`)) {
          return;
        }
        return true;
      });
    }
  }
  _exports.default = _default;
});

define("views/scheduled-job/list", ["exports", "views/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    searchPanel = false;
    setup() {
      super.setup();
      this.addMenuItem('buttons', {
        link: '#Admin/jobs',
        text: this.translate('Jobs', 'labels', 'Admin')
      });
      this.createView('search', 'views/base', {
        fullSelector: '#main > .search-container',
        template: 'scheduled-job/cronjob'
      });
    }
    afterRender() {
      super.afterRender();
      Espo.Ajax.getRequest('Admin/action/cronMessage').then(data => {
        this.$el.find('.cronjob .message').html(data.message);
        this.$el.find('.cronjob .command').html('<strong>' + data.command + '</strong>');
      });
    }
    getHeader() {
      return this.buildHeaderHtml([$('<a>').attr('href', '#Admin').text(this.translate('Administration', 'labels', 'Admin')), this.getLanguage().translate(this.scope, 'scopeNamesPlural')]);
    }
  }
  _exports.default = _default;
});

define("views/scheduled-job/record/list", ["exports", "views/record/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    quickDetailDisabled = true;
    quickEditDisabled = true;
    massActionList = ['remove', 'massUpdate'];
  }
  _exports.default = _default;
});

define("views/scheduled-job/record/detail", ["exports", "views/record/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    duplicateAction = false;
  }
  _exports.default = _default;
});

define("views/scheduled-job/record/panels/log", ["exports", "views/record/panels/relationship"], function (_exports, _relationship) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _relationship = _interopRequireDefault(_relationship);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _relationship.default {
    setupListLayout() {
      const jobWithTargetList = this.getMetadata().get(['clientDefs', 'ScheduledJob', 'jobWithTargetList']) || [];
      if (~jobWithTargetList.indexOf(this.model.get('job'))) {
        this.listLayoutName = 'listSmallWithTarget';
      }
    }
  }
  _exports.default = _default;
});

define("views/scheduled-job/fields/scheduling", ["exports", "views/fields/varchar"], function (_exports, _varchar) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _varchar = _interopRequireDefault(_varchar);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _varchar.default {
    setup() {
      super.setup();
      if (this.isEditMode() || this.isDetailMode()) {
        this.wait(Espo.loader.requirePromise('lib!cronstrue').then(Cronstrue => {
          this.Cronstrue = Cronstrue;
          this.listenTo(this.model, 'change:' + this.name, () => this.showText());
        }));
      }
    }
    afterRender() {
      super.afterRender();
      if (this.isEditMode() || this.isDetailMode()) {
        const $text = this.$text = $('<div class="small text-success"/>');
        this.$el.append($text);
        this.showText();
      }
    }

    /**
     * @private
     */
    showText() {
      let text;
      if (!this.$text || !this.$text.length) {
        return;
      }
      if (!this.Cronstrue) {
        return;
      }
      const exp = this.model.get(this.name);
      if (!exp) {
        this.$text.text('');
        return;
      }
      if (exp === '* * * * *') {
        this.$text.text(this.translate('As often as possible', 'labels', 'ScheduledJob'));
        return;
      }
      let locale = 'en';
      const localeList = Object.keys(this.Cronstrue.default.locales);
      const language = this.getLanguage().name;
      if (~localeList.indexOf(language)) {
        locale = language;
      } else if (~localeList.indexOf(language.split('_')[0])) {
        locale = language.split('_')[0];
      }
      try {
        text = this.Cronstrue.toString(exp, {
          use24HourTimeFormat: !this.getDateTime().hasMeridian(),
          locale: locale
        });
      } catch (e) {
        text = this.translate('Not valid');
      }
      this.$text.text(text);
    }
  }
  _exports.default = _default;
});

define("views/scheduled-job/fields/job", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setup() {
      super.setup();
      if (this.isEditMode() || this.isDetailMode()) {
        this.wait(true);
        Espo.Ajax.getRequest('Admin/jobs').then(data => {
          this.params.options = data.filter(item => {
            return !this.getMetadata().get(['entityDefs', 'ScheduledJob', 'jobs', item, 'isSystem']);
          });
          this.params.options.unshift('');
          this.wait(false);
        });
      }
      if (this.model.isNew()) {
        this.on('change', () => {
          const job = this.model.get('job');
          if (job) {
            const label = this.getLanguage().translateOption(job, 'job', 'ScheduledJob');
            const scheduling = this.getMetadata().get(`entityDefs.ScheduledJob.jobSchedulingMap.${job}`) || '*/10 * * * *';
            this.model.set('name', label);
            this.model.set('scheduling', scheduling);
            return;
          }
          this.model.set('name', '');
          this.model.set('scheduling', '');
        });
      }
    }
  }
  _exports.default = _default;
});

define("views/role/list", ["exports", "views/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    searchPanel = false;
  }
  _exports.default = _default;
});

define("views/role/record/detail-side", ["exports", "views/record/detail-side"], function (_exports, _detailSide) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detailSide = _interopRequireDefault(_detailSide);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detailSide.default {
    panelList = [{
      name: 'default',
      label: false,
      view: 'views/role/record/panels/side'
    }];
  }
  _exports.default = _default;
});

define("views/role/record/panels/side", ["exports", "views/record/panels/side"], function (_exports, _side) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _side = _interopRequireDefault(_side);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _side.default {
    template = 'role/record/panels/side';
  }
  _exports.default = _default;
});

define("views/role/modals/add-field", ["exports", "views/modal"], function (_exports, _modal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class RoleAddFieldModalView extends _modal.default {
    template = 'role/modals/add-field';
    backdrop = true;
    events = {
      /** @this RoleAddFieldModalView */
      'click a[data-action="addField"]': function (e) {
        this.trigger('add-fields', [$(e.currentTarget).data().name]);
      }
    };
    data() {
      return {
        dataList: this.dataList,
        scope: this.scope
      };
    }
    setup() {
      this.addHandler('keyup', 'input[data-name="quick-search"]', (e, /** HTMLInputElement */target) => {
        this.processQuickSearch(target.value);
      });
      this.addHandler('click', 'input[type="checkbox"]', (e, /** HTMLInputElement */target) => {
        const name = target.dataset.name;
        if (target.checked) {
          this.checkedList.push(name);
        } else {
          const index = this.checkedList.indexOf(name);
          if (index !== -1) {
            this.checkedList.splice(index, 1);
          }
        }
        this.checkedList.length ? this.enableButton('select') : this.disableButton('select');
      });
      this.buttonList = [{
        name: 'select',
        label: 'Select',
        style: 'danger',
        disabled: true,
        onClick: () => {
          this.trigger('add-fields', this.checkedList);
        }
      }, {
        name: 'cancel',
        label: 'Cancel',
        onClick: () => this.actionCancel()
      }];

      /** @type {string[]} */
      this.checkedList = [];
      const scope = this.scope = this.options.scope;
      this.headerText = this.translate(scope, 'scopeNamesPlural') + ' · ' + this.translate('Add Field');
      const fields = this.getMetadata().get(`entityDefs.${scope}.fields`) || {};
      const fieldList = [];
      const ignoreFieldList = this.options.ignoreFieldList || [];
      Object.keys(fields).filter(field => !ignoreFieldList.includes(field)).forEach(field => {
        if (!this.getFieldManager().isEntityTypeFieldAvailable(scope, field)) {
          return;
        }
        const mandatoryLevel = this.getMetadata().get(['app', this.options.type, 'mandatory', 'scopeFieldLevel', this.scope, field]);
        if (mandatoryLevel != null) {
          return;
        }
        fieldList.push(field);
      });
      this.fieldList = this.getLanguage().sortFieldList(scope, fieldList);

      /** @type {{name: string, label: string}[]} */
      this.dataList = this.fieldList.map(field => {
        return {
          name: field,
          label: this.translate(field, 'fields', this.scope)
        };
      });
    }
    afterRender() {
      this.$table = this.$el.find('table.fields-table');
      setTimeout(() => {
        this.element.querySelector('input[data-name="quick-search"]').focus();
      }, 0);
    }
    processQuickSearch(text) {
      text = text.trim();
      if (!text) {
        this.$table.find('tr').removeClass('hidden');
        return;
      }
      const matchedList = [];
      const lowerCaseText = text.toLowerCase();
      this.dataList.forEach(item => {
        let matched = false;
        const field = item.name;
        const label = item.label;
        if (label.indexOf(lowerCaseText) === 0 || field.toLowerCase().indexOf(lowerCaseText) === 0) {
          matched = true;
        }
        if (!matched) {
          const wordList = label.split(' ').concat(label.split(' '));
          wordList.forEach(word => {
            if (word.toLowerCase().indexOf(lowerCaseText) === 0) {
              matched = true;
            }
          });
        }
        if (matched) {
          matchedList.push(item);
        }
      });
      if (matchedList.length === 0) {
        this.$table.find('tr').addClass('hidden');
        return;
      }
      this.dataList.forEach(item => {
        const $row = this.$table.find(`tr[data-name="${item.name}"]`);
        if (!matchedList.includes(item)) {
          $row.addClass('hidden');
          return;
        }
        $row.removeClass('hidden');
      });
    }
  }
  var _default = _exports.default = RoleAddFieldModalView;
});

define("views/role/fields/permission", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setup() {
      this.params.style = {
        yes: 'success',
        all: 'success',
        account: 'info',
        contact: 'info',
        team: 'info',
        own: 'warning',
        no: 'danger',
        enabled: 'success',
        disabled: 'danger',
        'not-set': 'default'
      };
      super.setup();
    }
  }
  _exports.default = _default;
});

define("views/portal-role/list", ["exports", "views/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    searchPanel = false;
  }
  _exports.default = _default;
});

define("views/portal-role/record/table", ["exports", "views/role/record/table"], function (_exports, _table) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _table = _interopRequireDefault(_table);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _table.default {
    levelListMap = {
      'recordAllAccountContactOwnNo': ['all', 'account', 'contact', 'own', 'no'],
      'recordAllAccountOwnNo': ['all', 'account', 'own', 'no'],
      'recordAllContactOwnNo': ['all', 'contact', 'own', 'no'],
      'recordAllAccountNo': ['all', 'account', 'no'],
      'recordAllContactNo': ['all', 'contact', 'no'],
      'recordAllAccountContactNo': ['all', 'account', 'contact', 'no'],
      'recordAllOwnNo': ['all', 'own', 'no'],
      'recordAllNo': ['all', 'no'],
      'record': ['all', 'own', 'no']
    };
    levelList = ['all', 'account', 'contact', 'own', 'no'];
    type = 'aclPortal';
    lowestLevelByDefault = true;
    setupScopeList() {
      this.aclTypeMap = {};
      this.scopeList = [];
      const scopeListAll = this.getSortedScopeList();
      scopeListAll.forEach(scope => {
        if (this.getMetadata().get(`scopes.${scope}.disabled`) || this.getMetadata().get(`scopes.${scope}.disabledPortal`)) {
          return;
        }
        const acl = this.getMetadata().get(`scopes.${scope}.aclPortal`);
        if (acl) {
          this.scopeList.push(scope);
          this.aclTypeMap[scope] = acl;
          if (acl === true) {
            this.aclTypeMap[scope] = 'record';
          }
        }
      });
    }
    isAclFieldLevelDisabledForScope(scope) {
      return !!this.getMetadata().get(`scopes.${scope}.aclPortalFieldLevelDisabled`);
    }
  }
  _exports.default = _default;
});

define("views/portal-role/record/list", ["exports", "views/role/record/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {}
  _exports.default = _default;
});

define("views/portal-role/record/edit", ["exports", "views/role/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {
    tableView = 'views/portal-role/record/table';
    stickButtonsContainerAllTheWay = true;
  }
  _exports.default = _default;
});

define("views/portal-role/record/detail", ["exports", "views/role/record/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    tableView = 'views/portal-role/record/table';
    stickButtonsContainerAllTheWay = true;
  }
  _exports.default = _default;
});

define("views/portal/record/list", ["exports", "views/record/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    massActionList = ['remove'];
  }
  _exports.default = _default;
});

define("views/portal/fields/tab-list", ["exports", "views/settings/fields/tab-list"], function (_exports, _tabList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _tabList = _interopRequireDefault(_tabList);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _tabList.default {
    noGroups = true;
    setupOptions() {
      super.setupOptions();
      this.params.options = this.params.options.filter(tab => {
        if (tab === '_delimiter_') {
          return true;
        }
        if (tab === 'Stream') {
          return true;
        }
        return !!this.getMetadata().get(`scopes.${tab}.aclPortal`);
      });
    }
  }
  _exports.default = _default;
});

define("views/portal/fields/quick-create-list", ["exports", "views/settings/fields/quick-create-list"], function (_exports, _quickCreateList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _quickCreateList = _interopRequireDefault(_quickCreateList);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _quickCreateList.default {
    setup() {
      super.setup();
      this.params.options = this.params.options.filter(tab => {
        return !!this.getMetadata().get(`scopes.${tab}.aclPortal`);
      });
    }
  }
  _exports.default = _default;
});

define("views/portal/fields/custom-id", ["exports", "views/fields/varchar"], function (_exports, _varchar) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _varchar = _interopRequireDefault(_varchar);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _varchar.default {
    setup() {
      super.setup();
      this.listenTo(this, 'change', () => {
        let value = this.model.get('customId');
        if (!value || value === '') {
          return;
        }
        value = value.replace(/ /i, '-').toLowerCase();
        value = encodeURIComponent(value);
        this.model.set('customId', value);
      });
    }
  }
  _exports.default = _default;
});

define("views/lead-capture-log-record/modals/detail", ["exports", "views/modals/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    editDisabled = true;
    fullFormDisabled = true;
  }
  _exports.default = _default;
});

define("views/layout-set/layouts", ["exports", "views/admin/layouts/index"], function (_exports, _index) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _index = _interopRequireDefault(_index);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutsView extends _index.default {
    setup() {
      const setId = this.setId = this.options.layoutSetId;
      this.baseUrl = `#LayoutSet/editLayouts/id=${setId}`;
      super.setup();
      this.wait(this.getModelFactory().create('LayoutSet').then(m => {
        this.sModel = m;
        m.id = setId;
        return m.fetch();
      }));
    }
    getLayoutScopeDataList() {
      const dataList = [];
      const list = this.sModel.get('layoutList') || [];
      const scopeList = [];
      list.forEach(item => {
        const arr = item.split('.');
        const scope = arr[0];
        if (scopeList.includes(scope)) {
          return;
        }
        scopeList.push(scope);
      });
      scopeList.forEach(scope => {
        const o = {};
        o.scope = scope;
        o.url = this.baseUrl + '&scope=' + scope;
        o.typeDataList = [];
        const typeList = [];
        list.forEach(item => {
          const [scope, type] = item.split('.');
          if (scope !== o.scope) {
            return;
          }
          typeList.push(type);
        });
        typeList.forEach(type => {
          o.typeDataList.push({
            type: type,
            url: `${this.baseUrl}&scope=${scope}&type=${type}`,
            label: this.translateLayoutName(type, scope)
          });
        });
        o.typeList = typeList;
        dataList.push(o);
      });
      return dataList;
    }
    getHeaderHtml() {
      const separatorHtml = ' <span class="breadcrumb-separator"><span></span></span> ';
      return $('<span>').append($('<a>').attr('href', '#LayoutSet').text(this.translate('LayoutSet', 'scopeNamesPlural')), separatorHtml, $('<a>').attr('href', '#LayoutSet/view/' + this.sModel.id).text(this.sModel.get('name')), separatorHtml, $('<span>').text(this.translate('Edit Layouts', 'labels', 'LayoutSet'))).get(0).outerHTML;
    }
    navigate(scope, type) {
      const url = '#LayoutSet/editLayouts/id=' + this.setId + '&scope=' + scope + '&type=' + type;
      this.getRouter().navigate(url, {
        trigger: false
      });
    }
  }
  var _default = _exports.default = LayoutsView;
});

define("views/layout-set/record/list", ["exports", "views/record/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    massActionList = ['remove', 'export'];
  }
  _exports.default = _default;
});

define("views/layout-set/fields/layout-list", ["exports", "views/fields/multi-enum", "views/admin/layouts/index"], function (_exports, _multiEnum, _index) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  _index = _interopRequireDefault(_index);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _multiEnum.default {
    typeList = ['list', 'detail', 'listSmall', 'detailSmall', 'bottomPanelsDetail', 'filters', 'massUpdate', 'sidePanelsDetail', 'sidePanelsEdit', 'sidePanelsDetailSmall', 'sidePanelsEditSmall'];
    setupOptions() {
      this.params.options = [];
      this.translatedOptions = {};
      this.scopeList = Object.keys(this.getMetadata().get('scopes')).filter(item => this.getMetadata().get(['scopes', item, 'layouts'])).sort((v1, v2) => {
        return this.translate(v1, 'scopeNames').localeCompare(this.translate(v2, 'scopeNames'));
      });
      const dataList = _index.default.prototype.getLayoutScopeDataList.call(this);
      dataList.forEach(item1 => {
        item1.typeList.forEach(type => {
          const item = item1.scope + '.' + type;
          if (type.substr(-6) === 'Portal') {
            return;
          }
          this.params.options.push(item);
          this.translatedOptions[item] = this.translate(item1.scope, 'scopeNames') + ' . ' + this.translate(type, 'layouts', 'Admin');
        });
      });
    }

    // noinspection JSUnusedGlobalSymbols
    translateLayoutName(type, scope) {
      return _index.default.prototype.translateLayoutName.call(this, type, scope);
    }
  }
  _exports.default = _default;
});

define("views/layout-set/fields/edit", ["exports", "views/fields/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    // language=Handlebars
    detailTemplateContent = `<a
            class="btn btn-default"
            href="#LayoutSet/editLayouts/id={{model.id}}"
        >{{translate 'Edit Layouts' scope='LayoutSet'}}</a>`;
    editTemplateContent = '';
  }
  _exports.default = _default;
});

define("views/inbound-email/record/list", ["exports", "views/record/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    quickDetailDisabled = true;
    quickEditDisabled = true;
    massActionList = ['remove', 'massUpdate'];
    checkAllResultDisabled = true;
  }
  _exports.default = _default;
});

define("views/inbound-email/record/edit", ["exports", "views/record/edit", "views/inbound-email/record/detail"], function (_exports, _edit, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {
    setup() {
      super.setup();
      _detail.default.prototype.setupFieldsBehaviour.call(this);
      _detail.default.prototype.initSslFieldListening.call(this);
      if (_detail.default.prototype.wasFetched.call(this)) {
        this.setFieldReadOnly('fetchSince');
      }
    }
    modifyDetailLayout(layout) {
      _detail.default.prototype.modifyDetailLayout.call(this, layout);
    }
    controlStatusField() {
      _detail.default.prototype.controlStatusField.call(this);
    }
    initSmtpFieldsControl() {
      _detail.default.prototype.initSmtpFieldsControl.call(this);
    }
    controlSmtpFields() {
      _detail.default.prototype.controlSmtpFields.call(this);
    }
    controlSentFolderField() {
      _detail.default.prototype.controlSentFolderField.call(this);
    }
    controlSmtpAuthField() {
      _detail.default.prototype.controlSmtpAuthField.call(this);
    }
    wasFetched() {
      _detail.default.prototype.wasFetched.call(this);
    }
  }
  _exports.default = _default;
});

define("views/inbound-email/fields/test-send", ["exports", "views/email-account/fields/test-send"], function (_exports, _testSend) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _testSend = _interopRequireDefault(_testSend);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _testSend.default {
    getSmtpData() {
      return {
        server: this.model.get('smtpHost'),
        port: this.model.get('smtpPort'),
        auth: this.model.get('smtpAuth'),
        security: this.model.get('smtpSecurity'),
        username: this.model.get('smtpUsername'),
        password: this.model.get('smtpPassword') || null,
        authMechanism: this.model.get('smtpAuthMechanism'),
        fromName: this.model.get('fromName'),
        fromAddress: this.model.get('emailAddress'),
        type: 'inboundEmail',
        id: this.model.id
      };
    }
  }
  _exports.default = _default;
});

define("views/inbound-email/fields/test-connection", ["exports", "views/email-account/fields/test-connection"], function (_exports, _testConnection) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _testConnection = _interopRequireDefault(_testConnection);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _testConnection.default {
    url = 'InboundEmail/action/testConnection';
  }
  _exports.default = _default;
});

define("views/inbound-email/fields/target-user-position", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setup() {
      super.setup();
      this.translatedOptions = {
        '': `--${this.translate('All')}--`
      };
      this.params.options = [''];
      if (this.model.get('targetUserPosition') && this.model.get('teamId')) {
        this.params.options.push(this.model.get('targetUserPosition'));
      }
      this.loadRoleList(() => {
        if (this.mode === this.MODE_EDIT) {
          if (this.isRendered()) {
            this.render();
          }
        }
      });
      this.listenTo(this.model, 'change:teamId', () => {
        this.loadRoleList(() => this.render());
      });
    }

    /**
     * @private
     * @param {function} callback
     */
    loadRoleList(callback) {
      const teamId = this.model.attributes.teamId;
      if (!teamId) {
        this.params.options = [''];
      }
      this.getModelFactory().create('Team', /** import('model').default */team => {
        team.id = teamId;
        team.fetch().then(() => {
          this.params.options = team.get('positionList') || [];
          this.params.options.unshift('');
          callback.call(this);
        });
      });
    }
  }
  _exports.default = _default;
});

define("views/inbound-email/fields/folders", ["exports", "views/email-account/fields/folders"], function (_exports, _folders) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _folders = _interopRequireDefault(_folders);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _folders.default {
    // noinspection JSUnusedGlobalSymbols
    getFoldersUrl = 'InboundEmail/action/getFolders';
  }
  _exports.default = _default;
});

define("views/inbound-email/fields/folder", ["exports", "views/email-account/fields/folder"], function (_exports, _folder) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _folder = _interopRequireDefault(_folder);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _folder.default {
    // noinspection JSUnusedGlobalSymbols
    getFoldersUrl = 'InboundEmail/action/getFolders';
  }
  _exports.default = _default;
});

define("views/inbound-email/fields/email-address", ["exports", "views/fields/email-address"], function (_exports, _emailAddress) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _emailAddress = _interopRequireDefault(_emailAddress);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _emailAddress.default {
    setup() {
      super.setup();
      this.on('change', () => {
        const emailAddress = this.model.get('emailAddress');
        this.model.set('name', emailAddress);
        if (this.model.isNew() || !this.model.get('replyToAddress')) {
          this.model.set('replyToAddress', emailAddress);
        }
      });
    }
  }
  _exports.default = _default;
});

define("views/extension/record/row-actions", ["exports", "views/record/row-actions/default"], function (_exports, _default2) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _default2 = _interopRequireDefault(_default2);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _default2.default {
    getActionList() {
      if (!this.options.acl.edit) {
        return [];
      }
      if (this.model.get('isInstalled')) {
        return [{
          action: 'uninstall',
          label: 'Uninstall',
          data: {
            id: this.model.id
          }
        }];
      }
      return [{
        action: 'install',
        label: 'Install',
        data: {
          id: this.model.id
        }
      }, {
        action: 'quickRemove',
        label: 'Remove',
        data: {
          id: this.model.id
        }
      }];
    }
  }
  _exports.default = _default;
});

define("views/extension/record/list", ["exports", "views/record/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    rowActionsView = 'views/extension/record/row-actions';
    checkboxes = false;
    quickDetailDisabled = true;
    quickEditDisabled = true;
    massActionList = [];
  }
  _exports.default = _default;
});

define("views/authentication-provider/record/edit", ["exports", "helpers/misc/authentication-provider", "views/record/edit"], function (_exports, _authenticationProvider, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _authenticationProvider = _interopRequireDefault(_authenticationProvider);
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {
    saveAndNewAction = false;

    /**
     * @private
     * @type {Helper}
     */
    helper;
    setup() {
      this.helper = new _authenticationProvider.default(this);
      super.setup();
    }
    setupDynamicBehavior() {
      this.dynamicLogicDefs = this.helper.setupMethods();
      super.setupDynamicBehavior();
      this.helper.setupPanelsVisibility(() => {
        this.processDynamicLogic();
      });
    }

    // noinspection JSUnusedGlobalSymbols
    modifyDetailLayout(layout) {
      this.helper.modifyDetailLayout(layout);
    }
  }
  _exports.default = _default;
});

define("views/authentication-provider/record/detail", ["exports", "views/record/detail", "helpers/misc/authentication-provider"], function (_exports, _detail, _authenticationProvider) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  _authenticationProvider = _interopRequireDefault(_authenticationProvider);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    editModeDisabled = true;

    /**
     * @private
     * @type {Helper}
     */
    helper;
    setup() {
      this.helper = new _authenticationProvider.default(this);
      super.setup();
    }
    setupDynamicBehavior() {
      this.dynamicLogicDefs = this.helper.setupMethods();
      super.setupDynamicBehavior();
      this.helper.setupPanelsVisibility(() => {
        this.processDynamicLogic();
      });
    }

    // noinspection JSUnusedGlobalSymbols
    modifyDetailLayout(layout) {
      this.helper.modifyDetailLayout(layout);
    }
  }
  _exports.default = _default;
});

define("views/authentication-provider/fields/method", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setupOptions() {
      /** @var {Object.<string, Object.<string, *>>} defs */
      const defs = this.getMetadata().get(['authenticationMethods']) || {};
      const options = Object.keys(defs).filter(item => {
        /** @var {Record} */
        const data = defs[item].provider || {};
        return data.isAvailable;
      });
      options.unshift('');
      this.params.options = options;
    }
  }
  _exports.default = _default;
});

define("views/api-user/list", ["exports", "views/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    getCreateAttributes() {
      return {
        type: 'api'
      };
    }
  }
  _exports.default = _default;
});

define("views/admin/user-interface", ["exports", "views/settings/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {
    layoutName = 'userInterface';
    saveAndContinueEditingAction = false;
    setup() {
      super.setup();
      this.controlColorsField();
      this.listenTo(this.model, 'change:scopeColorsDisabled', () => this.controlColorsField());
      this.on('save', initialAttributes => {
        if (this.model.get('theme') !== initialAttributes.theme || (this.model.get('themeParams').navbar || {}) !== initialAttributes.themeParams.navbar) {
          this.setConfirmLeaveOut(false);
          window.location.reload();
        }
      });
    }
    controlColorsField() {
      if (this.model.get('scopeColorsDisabled')) {
        this.hideField('tabColorsDisabled');
      } else {
        this.showField('tabColorsDisabled');
      }
    }
  }
  _exports.default = _default;
});

define("views/admin/sms", ["exports", "views/settings/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {
    layoutName = 'sms';
  }
  _exports.default = _default;
});

define("views/admin/settings", ["exports", "views/settings/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class SettingsAdminRecordView extends _edit.default {
    layoutName = 'settings';
    saveAndContinueEditingAction = false;
    dynamicLogicDefs = {
      fields: {
        phoneNumberPreferredCountryList: {
          visible: {
            conditionGroup: [{
              attribute: 'phoneNumberInternational',
              type: 'isTrue'
            }]
          }
        },
        phoneNumberExtensions: {
          visible: {
            conditionGroup: [{
              attribute: 'phoneNumberInternational',
              type: 'isTrue'
            }]
          }
        }
      }
    };
    setup() {
      super.setup();
      if (this.getHelper().getAppParam('isRestrictedMode') && !this.getUser().isSuperAdmin()) {
        this.hideField('cronDisabled');
        this.hideField('maintenanceMode');
        this.setFieldReadOnly('useWebSocket');
        this.setFieldReadOnly('siteUrl');
      }
    }
  }
  var _default = _exports.default = SettingsAdminRecordView;
});

define("views/admin/outbound-emails", ["exports", "views/settings/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {
    layoutName = 'outboundEmails';
    saveAndContinueEditingAction = false;
    dynamicLogicDefs = {
      fields: {
        smtpUsername: {
          visible: {
            conditionGroup: [{
              type: 'isNotEmpty',
              attribute: 'smtpServer'
            }, {
              type: 'isTrue',
              attribute: 'smtpAuth'
            }]
          },
          required: {
            conditionGroup: [{
              type: 'isNotEmpty',
              attribute: 'smtpServer'
            }, {
              type: 'isTrue',
              attribute: 'smtpAuth'
            }]
          }
        },
        smtpPassword: {
          visible: {
            conditionGroup: [{
              type: 'isNotEmpty',
              attribute: 'smtpServer'
            }, {
              type: 'isTrue',
              attribute: 'smtpAuth'
            }]
          }
        },
        smtpPort: {
          visible: {
            conditionGroup: [{
              type: 'isNotEmpty',
              attribute: 'smtpServer'
            }]
          },
          required: {
            conditionGroup: [{
              type: 'isNotEmpty',
              attribute: 'smtpServer'
            }]
          }
        },
        smtpSecurity: {
          visible: {
            conditionGroup: [{
              type: 'isNotEmpty',
              attribute: 'smtpServer'
            }]
          }
        },
        smtpAuth: {
          visible: {
            conditionGroup: [{
              type: 'isNotEmpty',
              attribute: 'smtpServer'
            }]
          }
        }
      }
    };
    afterRender() {
      super.afterRender();
      const smtpSecurityField = this.getFieldView('smtpSecurity');
      this.listenTo(smtpSecurityField, 'change', () => {
        const smtpSecurity = smtpSecurityField.fetch()['smtpSecurity'];
        if (smtpSecurity === 'SSL') {
          this.model.set('smtpPort', 465);
        } else if (smtpSecurity === 'TLS') {
          this.model.set('smtpPort', 587);
        } else {
          this.model.set('smtpPort', 25);
        }
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/notifications", ["exports", "views/settings/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {
    layoutName = 'notifications';
    saveAndContinueEditingAction = false;
    dynamicLogicDefs = {
      fields: {
        assignmentEmailNotificationsEntityList: {
          visible: {
            conditionGroup: [{
              type: 'isTrue',
              attribute: 'assignmentEmailNotifications'
            }]
          }
        },
        adminNotificationsNewVersion: {
          visible: {
            conditionGroup: [{
              type: 'isTrue',
              attribute: 'adminNotifications'
            }]
          }
        },
        adminNotificationsNewExtensionVersion: {
          visible: {
            conditionGroup: [{
              type: 'isTrue',
              attribute: 'adminNotifications'
            }]
          }
        }
      }
    };
    setup() {
      super.setup();
      this.controlStreamEmailNotificationsEntityList();
      this.listenTo(this.model, 'change', model => {
        if (model.hasChanged('streamEmailNotifications') || model.hasChanged('portalStreamEmailNotifications')) {
          this.controlStreamEmailNotificationsEntityList();
        }
      });
    }
    controlStreamEmailNotificationsEntityList() {
      if (this.model.get('streamEmailNotifications') || this.model.get('portalStreamEmailNotifications')) {
        this.showField('streamEmailNotificationsEntityList');
        this.showField('streamEmailNotificationsTypeList');
      } else {
        this.hideField('streamEmailNotificationsEntityList');
        this.hideField('streamEmailNotificationsTypeList');
      }
    }
  }
  _exports.default = _default;
});

define("views/admin/jobs-settings", ["exports", "views/settings/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {
    layoutName = 'jobsSettings';
    saveAndContinueEditingAction = false;
    dynamicLogicDefs = {
      fields: {
        jobPoolConcurrencyNumber: {
          visible: {
            conditionGroup: [{
              type: 'isTrue',
              attribute: 'jobRunInParallel'
            }]
          }
        }
      }
    };
    setup() {
      super.setup();
      if (this.getHelper().getAppParam('isRestrictedMode') && !this.getUser().isSuperAdmin()) {
        this.setFieldReadOnly('jobRunInParallel');
        this.setFieldReadOnly('jobMaxPortion');
        this.setFieldReadOnly('jobPoolConcurrencyNumber');
        this.setFieldReadOnly('daemonInterval');
        this.setFieldReadOnly('daemonMaxProcessNumber');
        this.setFieldReadOnly('daemonProcessTimeout');
      }
    }
  }
  _exports.default = _default;
});

define("views/admin/inbound-emails", ["exports", "views/settings/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {
    layoutName = 'inboundEmails';
    saveAndContinueEditingAction = false;
  }
  _exports.default = _default;
});

define("views/admin/currency", ["exports", "views/settings/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {
    layoutName = 'currency';
    saveAndContinueEditingAction = false;
    setup() {
      super.setup();
      this.listenTo(this.model, 'change:currencyList', (model, value, o) => {
        if (!o.ui) {
          return;
        }
        const currencyList = Espo.Utils.clone(model.get('currencyList'));
        this.setFieldOptionList('defaultCurrency', currencyList);
        this.setFieldOptionList('baseCurrency', currencyList);
        this.controlCurrencyRatesVisibility();
      });
      this.listenTo(this.model, 'change', (model, o) => {
        if (!o.ui) {
          return;
        }
        if (model.hasChanged('currencyList') || model.hasChanged('baseCurrency')) {
          const currencyRatesField = this.getFieldView('currencyRates');
          if (currencyRatesField) {
            currencyRatesField.reRender();
          }
        }
      });
      this.controlCurrencyRatesVisibility();
    }
    controlCurrencyRatesVisibility() {
      const currencyList = this.model.get('currencyList');
      if (currencyList.length < 2) {
        this.hideField('currencyRates');
      } else {
        this.showField('currencyRates');
      }
    }
  }
  _exports.default = _default;
});

define("views/admin/authentication", ["exports", "views/settings/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class AdminAuthenticationRecordView extends _edit.default {
    layoutName = 'authentication';
    saveAndContinueEditingAction = false;
    dynamicLogicDefs = {
      fields: {
        authIpAddressWhitelist: {
          visible: {
            conditionGroup: [{
              attribute: 'authIpAddressCheck',
              type: 'isTrue'
            }]
          },
          required: {
            conditionGroup: [{
              attribute: 'authIpAddressCheck',
              type: 'isTrue'
            }]
          }
        },
        authIpAddressCheckExcludedUsers: {
          visible: {
            conditionGroup: [{
              attribute: 'authIpAddressCheck',
              type: 'isTrue'
            }]
          }
        }
      },
      panels: {}
    };
    setup() {
      this.methodList = [];
      const defs = this.getMetadata().get(['authenticationMethods']) || {};
      for (const method in defs) {
        if (defs[method].settings && defs[method].settings.isAvailable) {
          this.methodList.push(method);
        }
      }
      this.authFields = {};
      super.setup();
      if (this.getHelper().getAppParam('isRestrictedMode') && !this.getUser().isSuperAdmin()) {
        this.setFieldReadOnly('authIpAddressCheck', true);
        this.setFieldReadOnly('authIpAddressWhitelist', true);
        this.setFieldReadOnly('authIpAddressCheckExcludedUsers', true);
      }
      this.handlePanelsVisibility();
      this.listenTo(this.model, 'change:authenticationMethod', () => {
        this.handlePanelsVisibility();
      });
      this.manage2FAFields();
      this.listenTo(this.model, 'change:auth2FA', () => {
        this.manage2FAFields();
      });
      this.managePasswordRecoveryFields();
      this.listenTo(this.model, 'change:passwordRecoveryDisabled', () => {
        this.managePasswordRecoveryFields();
      });
    }
    setupBeforeFinal() {
      this.dynamicLogicDefs = Espo.Utils.cloneDeep(this.dynamicLogicDefs);
      this.methodList.forEach(method => {
        const fieldList = this.getMetadata().get(['authenticationMethods', method, 'settings', 'fieldList']);
        if (fieldList) {
          this.authFields[method] = fieldList;
        }
        const mDynamicLogicFieldsDefs = this.getMetadata().get(['authenticationMethods', method, 'settings', 'dynamicLogic', 'fields']);
        if (mDynamicLogicFieldsDefs) {
          for (const f in mDynamicLogicFieldsDefs) {
            this.dynamicLogicDefs.fields[f] = Espo.Utils.cloneDeep(mDynamicLogicFieldsDefs[f]);
          }
        }
      });
      super.setupBeforeFinal();
    }
    modifyDetailLayout(layout) {
      this.methodList.forEach(method => {
        let mLayout = this.getMetadata().get(['authenticationMethods', method, 'settings', 'layout']);
        if (!mLayout) {
          return;
        }
        mLayout = Espo.Utils.cloneDeep(mLayout);
        mLayout.name = method;
        mLayout.tabBreak = true;
        mLayout.tabLabel = mLayout.label;
        mLayout.label = null;
        this.prepareLayout(mLayout, method);
        layout.push(mLayout);
      });
    }
    prepareLayout(layout, method) {
      layout.rows.forEach(row => {
        row.filter(item => !item.noLabel && !item.labelText && item.name).forEach(item => {
          const labelText = this.translate(item.name, 'fields', 'Settings');
          if (labelText && labelText.toLowerCase().indexOf(method.toLowerCase() + ' ') === 0) {
            item.labelText = labelText.substring(method.length + 1);
          }
        });
      });
    }
    handlePanelsVisibility() {
      const authenticationMethod = this.model.get('authenticationMethod');
      this.methodList.forEach(method => {
        const fieldList = this.authFields[method] || [];
        if (method !== authenticationMethod) {
          this.hidePanel(method);
          fieldList.forEach(field => {
            this.hideField(field);
          });
          return;
        }
        this.showPanel(method);
        fieldList.forEach(field => {
          this.showField(field);
        });
        this.processDynamicLogic();
      });
    }
    manage2FAFields() {
      if (this.model.get('auth2FA')) {
        this.showField('auth2FAForced');
        this.showField('auth2FAMethodList');
        this.showField('auth2FAInPortal');
        this.setFieldRequired('auth2FAMethodList');
        return;
      }
      this.hideField('auth2FAForced');
      this.hideField('auth2FAMethodList');
      this.hideField('auth2FAInPortal');
      this.setFieldNotRequired('auth2FAMethodList');
    }
    managePasswordRecoveryFields() {
      if (!this.model.get('passwordRecoveryDisabled')) {
        this.showField('passwordRecoveryForAdminDisabled');
        this.showField('passwordRecoveryForInternalUsersDisabled');
        this.showField('passwordRecoveryNoExposure');
        return;
      }
      this.hideField('passwordRecoveryForAdminDisabled');
      this.hideField('passwordRecoveryForInternalUsersDisabled');
      this.hideField('passwordRecoveryNoExposure');
    }
  }
  var _default = _exports.default = AdminAuthenticationRecordView;
});

define("views/admin/upgrade/ready", ["exports", "views/modal"], function (_exports, _modal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _modal.default {
    template = 'admin/upgrade/ready';
    cssName = 'ready-modal';
    createButton = true;
    data() {
      return {
        version: this.upgradeData.version,
        text: this.translate('upgradeVersion', 'messages', 'Admin').replace('{version}', this.upgradeData.version)
      };
    }
    setup() {
      this.buttonList = [{
        name: 'run',
        label: this.translate('Run Upgrade', 'labels', 'Admin'),
        style: 'danger',
        onClick: () => this.actionRun()
      }, {
        name: 'cancel',
        label: 'Cancel'
      }];
      this.upgradeData = this.options.upgradeData;
      this.headerText = this.getLanguage().translate('Ready for upgrade', 'labels', 'Admin');
    }
    actionRun() {
      this.trigger('run');
      this.remove();
    }
  }
  _exports.default = _default;
});

define("views/admin/upgrade/index", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class UpgradeIndexView extends _view.default {
    template = 'admin/upgrade/index';
    packageContents = null;
    data() {
      return {
        versionMsg: this.translate('Current version') + ': ' + this.getConfig().get('version'),
        infoMsg: this.translate('upgradeInfo', 'messages', 'Admin').replace('{url}', 'https://www.espocrm.com/documentation/administration/upgrading/'),
        backupsMsg: this.translate('upgradeBackup', 'messages', 'Admin'),
        upgradeRecommendation: this.translate('upgradeRecommendation', 'messages', 'Admin'),
        downloadMsg: this.translate('downloadUpgradePackage', 'messages', 'Admin').replace('{url}', 'https://www.espocrm.com/download/upgrades')
      };
    }
    afterRender() {
      this.$el.find('.panel-body a').attr('target', '_BLANK');
    }
    events = {
      /** @this UpgradeIndexView */
      'change input[name="package"]': function (e) {
        this.$el.find('button[data-action="upload"]').addClass('disabled').attr('disabled', 'disabled');
        this.$el.find('.message-container').html('');
        const files = e.currentTarget.files;
        if (files.length) {
          this.selectFile(files[0]);
        }
      },
      /** @this UpgradeIndexView */
      'click button[data-action="upload"]': function () {
        this.upload();
      }
    };
    selectFile(file) {
      const fileReader = new FileReader();
      fileReader.onload = e => {
        this.packageContents = e.target.result;
        this.$el.find('button[data-action="upload"]').removeClass('disabled').removeAttr('disabled');
      };
      fileReader.readAsDataURL(file);
    }
    showError(msg) {
      msg = this.translate(msg, 'errors', 'Admin');
      this.$el.find('.message-container').html(msg);
    }
    upload() {
      this.$el.find('button[data-action="upload"]').addClass('disabled').attr('disabled', 'disabled');
      Espo.Ui.notify(this.translate('Uploading...'));
      Espo.Ajax.postRequest('Admin/action/uploadUpgradePackage', this.packageContents, {
        contentType: 'application/zip',
        timeout: 0
      }).then(data => {
        if (!data.id) {
          this.showError(this.translate('Error occurred'));
          return;
        }
        Espo.Ui.notify(false);
        this.createView('popup', 'views/admin/upgrade/ready', {
          upgradeData: data
        }, view => {
          view.render();
          this.$el.find('button[data-action="upload"]').removeClass('disabled').removeAttr('disabled');
          view.once('run', () => {
            view.close();
            this.$el.find('.panel.upload').addClass('hidden');
            this.run(data.id, data.version);
          });
        });
      }).catch(xhr => {
        this.showError(xhr.getResponseHeader('X-Status-Reason'));
        Espo.Ui.notify(false);
      });
    }
    textNotification(text) {
      this.$el.find('.notify-text').html(text);
    }
    run(id, version) {
      const msg = this.translate('Upgrading...', 'labels', 'Admin');
      Espo.Ui.notify(this.translate('pleaseWait', 'messages'));
      this.textNotification(msg);
      Espo.Ajax.postRequest('Admin/action/runUpgrade', {
        id: id
      }, {
        timeout: 0,
        bypassAppReload: true
      }).then(() => {
        const cache = this.getCache();
        if (cache) {
          cache.clear();
        }
        this.createView('popup', 'views/admin/upgrade/done', {
          version: version
        }, view => {
          Espo.Ui.notify(false);
          view.render();
        });
      }).catch(xhr => {
        this.$el.find('.panel.upload').removeClass('hidden');
        const msg = xhr.getResponseHeader('X-Status-Reason');
        this.textNotification(this.translate('Error') + ': ' + msg);
      });
    }
  }
  _exports.default = UpgradeIndexView;
});

define("views/admin/upgrade/done", ["exports", "views/modal"], function (_exports, _modal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _modal.default {
    template = 'admin/upgrade/done';
    cssName = 'done-modal';
    data() {
      return {
        version: this.options.version,
        text: this.translate('upgradeDone', 'messages', 'Admin').replace('{version}', this.options.version)
      };
    }
    setup() {
      this.on('remove', () => window.location.reload());
      this.buttonList = [{
        name: 'close',
        label: 'Close',
        onClick: dialog => {
          setTimeout(() => {
            this.getRouter().navigate('#Admin', {
              trigger: true
            });
          }, 500);
          dialog.close();
        }
      }];
      this.headerText = this.getLanguage().translate('Upgraded successfully', 'labels', 'Admin');
    }
  }
  _exports.default = _default;
});

define("views/admin/template-manager/index", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class TemplateManagerIndexView extends _view.default {
    template = 'admin/template-manager/index';
    data() {
      return {
        templateDataList: this.templateDataList
      };
    }
    events = {
      /** @this TemplateManagerIndexView */
      'click [data-action="selectTemplate"]': function (e) {
        const name = $(e.currentTarget).data('name');
        this.getRouter().checkConfirmLeaveOut(() => {
          this.selectTemplate(name);
        });
      }
    };
    setup() {
      this.templateDataList = [];
      const templateList = Object.keys(this.getMetadata().get(['app', 'templates']) || {});
      templateList.sort((v1, v2) => {
        return this.translate(v1, 'templates', 'Admin').localeCompare(this.translate(v2, 'templates', 'Admin'));
      });
      templateList.forEach(template => {
        const defs = /** @type {Record} */
        this.getMetadata().get(['app', 'templates', template]);
        if (defs.scopeListConfigParam || defs.scopeList) {
          const scopeList = Espo.Utils.clone(defs.scopeList || this.getConfig().get(defs.scopeListConfigParam) || []);
          scopeList.sort((v1, v2) => {
            return this.translate(v1, 'scopeNames').localeCompare(this.translate(v2, 'scopeNames'));
          });
          scopeList.forEach(scope => {
            const o = {
              name: `${template}_${scope}`,
              text: this.translate(template, 'templates', 'Admin') + ' · ' + this.translate(scope, 'scopeNames')
            };
            this.templateDataList.push(o);
          });
          return;
        }
        const o = {
          name: template,
          text: this.translate(template, 'templates', 'Admin')
        };
        this.templateDataList.push(o);
      });
      this.selectedTemplate = this.options.name;
      if (this.selectedTemplate) {
        this.once('after:render', () => {
          this.selectTemplate(this.selectedTemplate, true);
        });
      }
    }
    selectTemplate(name) {
      this.selectedTemplate = name;
      this.getRouter().navigate('#Admin/templateManager/name=' + this.selectedTemplate, {
        trigger: false
      });
      this.createRecordView();
      this.$el.find('[data-action="selectTemplate"]').removeClass('disabled').removeAttr('disabled');
      this.$el.find(`[data-name="${name}"][data-action="selectTemplate"]`).addClass('disabled').attr('disabled', 'disabled');
    }
    createRecordView() {
      Espo.Ui.notify(' ... ');
      this.createView('record', 'views/admin/template-manager/edit', {
        selector: '.template-record',
        name: this.selectedTemplate
      }, view => {
        view.render();
        Espo.Ui.notify(false);
        $(window).scrollTop(0);
      });
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Template Manager', 'labels', 'Admin'));
    }
  }
  _exports.default = TemplateManagerIndexView;
});

define("views/admin/template-manager/edit", ["exports", "view", "model"], function (_exports, _view, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class TemplateManagerEditView extends _view.default {
    template = 'admin/template-manager/edit';
    data() {
      return {
        title: this.title,
        hasSubject: this.hasSubject
      };
    }
    events = {
      /** @this TemplateManagerEditView */
      'click [data-action="save"]': function () {
        this.actionSave();
      },
      /** @this TemplateManagerEditView */
      'click [data-action="cancel"]': function () {
        this.actionCancel();
      },
      /** @this TemplateManagerEditView */
      'click [data-action="resetToDefault"]': function () {
        this.actionResetToDefault();
      },
      /** @this TemplateManagerEditView */
      'keydown.form': function (e) {
        const key = Espo.Utils.getKeyFromKeyEvent(e);
        if (key === 'Control+KeyS' || key === 'Control+Enter') {
          this.actionSave();
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    setup() {
      this.wait(true);
      this.fullName = this.options.name;
      this.name = this.fullName;
      this.scope = null;
      const arr = this.fullName.split('_');
      if (arr.length > 1) {
        this.scope = arr[1];
        this.name = arr[0];
      }
      this.hasSubject = !this.getMetadata().get(['app', 'templates', this.name, 'noSubject']);
      this.title = this.translate(this.name, 'templates', 'Admin');
      if (this.scope) {
        this.title += ' · ' + this.translate(this.scope, 'scopeNames');
      }
      this.attributes = {};
      Espo.Ajax.getRequest('TemplateManager/action/getTemplate', {
        name: this.name,
        scope: this.scope
      }).then(data => {
        const model = this.model = new _model.default();
        model.name = 'TemplateManager';
        model.set('body', data.body);
        this.attributes.body = data.body;
        if (this.hasSubject) {
          model.set('subject', data.subject);
          this.attributes.subject = data.subject;
        }
        this.listenTo(model, 'change', () => {
          this.setConfirmLeaveOut(true);
        });
        this.createView('bodyField', 'views/admin/template-manager/fields/body', {
          name: 'body',
          model: model,
          selector: '.body-field',
          mode: 'edit'
        });
        if (this.hasSubject) {
          this.createView('subjectField', 'views/fields/varchar', {
            name: 'subject',
            model: model,
            selector: '.subject-field',
            mode: 'edit'
          });
        }
        this.wait(false);
      });
    }
    setConfirmLeaveOut(value) {
      this.getRouter().confirmLeaveOut = value;
    }
    afterRender() {
      this.$save = this.$el.find('button[data-action="save"]');
      this.$cancel = this.$el.find('button[data-action="cancel"]');
      this.$resetToDefault = this.$el.find('button[data-action="resetToDefault"]');
    }
    actionSave() {
      this.$save.addClass('disabled').attr('disabled');
      this.$cancel.addClass('disabled').attr('disabled');
      this.$resetToDefault.addClass('disabled').attr('disabled');
      const bodyFieldView = /** @type {import('views/fields/base').default} */
      this.getView('bodyField');
      bodyFieldView.fetchToModel();
      const data = {
        name: this.name,
        body: this.model.get('body')
      };
      if (this.scope) {
        data.scope = this.scope;
      }
      if (this.hasSubject) {
        const subjectFieldView = /** @type {import('views/fields/base').default} */
        this.getView('subjectField');
        subjectFieldView.fetchToModel();
        data.subject = this.model.get('subject');
      }
      Espo.Ui.notify(this.translate('saving', 'messages'));
      Espo.Ajax.postRequest('TemplateManager/action/saveTemplate', data).then(() => {
        this.setConfirmLeaveOut(false);
        this.attributes.body = data.body;
        this.attributes.subject = data.subject;
        this.$save.removeClass('disabled').removeAttr('disabled');
        this.$cancel.removeClass('disabled').removeAttr('disabled');
        this.$resetToDefault.removeClass('disabled').removeAttr('disabled');
        Espo.Ui.success(this.translate('Saved'));
      }).catch(() => {
        this.$save.removeClass('disabled').removeAttr('disabled');
        this.$cancel.removeClass('disabled').removeAttr('disabled');
        this.$resetToDefault.removeClass('disabled').removeAttr('disabled');
      });
    }
    actionCancel() {
      this.model.set('subject', this.attributes.subject);
      this.model.set('body', this.attributes.body);
      this.setConfirmLeaveOut(false);
    }
    actionResetToDefault() {
      this.confirm(this.translate('confirmation', 'messages'), () => {
        this.$save.addClass('disabled').attr('disabled');
        this.$cancel.addClass('disabled').attr('disabled');
        this.$resetToDefault.addClass('disabled').attr('disabled');
        const data = {
          name: this.name,
          body: this.model.get('body')
        };
        if (this.scope) {
          data.scope = this.scope;
        }
        Espo.Ui.notify(' ... ');
        Espo.Ajax.postRequest('TemplateManager/action/resetTemplate', data).then(returnData => {
          this.$save.removeClass('disabled').removeAttr('disabled');
          this.$cancel.removeClass('disabled').removeAttr('disabled');
          this.$resetToDefault.removeClass('disabled').removeAttr('disabled');
          this.attributes.body = returnData.body;
          this.attributes.subject = returnData.subject;
          this.model.set('subject', returnData.subject);
          this.model.set('body', returnData.body);
          this.setConfirmLeaveOut(false);
          Espo.Ui.notify(false);
        }).catch(() => {
          this.$save.removeClass('disabled').removeAttr('disabled');
          this.$cancel.removeClass('disabled').removeAttr('disabled');
          this.$resetToDefault.removeClass('disabled').removeAttr('disabled');
        });
      });
    }
  }
  _exports.default = TemplateManagerEditView;
});

define("views/admin/template-manager/fields/body", ["exports", "views/fields/wysiwyg"], function (_exports, _wysiwyg) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _wysiwyg = _interopRequireDefault(_wysiwyg);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _wysiwyg.default {
    htmlPurificationForEditDisabled = true;
    handlebars = true;
  }
  _exports.default = _default;
});

define("views/admin/system-requirements/index", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _view.default {
    template = 'admin/system-requirements/index';

    /** @type {Record} */
    requirements;
    data() {
      return {
        phpRequirementList: this.requirements.php,
        databaseRequirementList: this.requirements.database,
        permissionRequirementList: this.requirements.permission
      };
    }
    setup() {
      this.requirements = {};
      Espo.Ui.notify(' ... ');
      const promise = Espo.Ajax.getRequest('Admin/action/systemRequirementList').then(requirements => {
        this.requirements = requirements;
        Espo.Ui.notify();
      });
      this.wait(promise);
    }
  }
  _exports.default = _default;
});

define("views/admin/panels/notifications", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _view.default {
    template = 'admin/panels/notifications';
    data() {
      return {
        notificationList: this.notificationList
      };
    }
    setup() {
      this.notificationList = [];
      Espo.Ajax.getRequest('Admin/action/adminNotificationList').then(notificationList => {
        this.notificationList = notificationList;
        if (this.isRendered() || this.isBeingRendered()) {
          this.reRender();
        }
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/link-manager/modals/edit", ["exports", "views/modal", "model", "views/admin/link-manager/index", "views/fields/enum"], function (_exports, _modal, _model, _index, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  _model = _interopRequireDefault(_model);
  _index = _interopRequireDefault(_index);
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LinkManagerEditModalView extends _modal.default {
    template = 'admin/link-manager/modals/edit';
    cssName = 'edit';
    className = 'dialog dialog-record';
    /** @type {import('model').default & {fetchedAttributes?: Record}} */
    model;
    shortcutKeys = {
      /** @this LinkManagerEditModalView */
      'Control+KeyS': function (e) {
        this.save({
          noClose: true
        });
        e.preventDefault();
        e.stopPropagation();
      },
      /** @this LinkManagerEditModalView */
      'Control+Enter': function (e) {
        if (document.activeElement instanceof HTMLInputElement) {
          document.activeElement.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
        this.save();
        e.preventDefault();
        e.stopPropagation();
      }
    };
    setup() {
      this.buttonList = [{
        name: 'save',
        label: 'Save',
        style: 'danger',
        onClick: () => {
          this.save();
        }
      }, {
        name: 'cancel',
        label: 'Cancel',
        onClick: () => {
          this.close();
        }
      }];
      const scope = this.scope = this.options.scope;
      const link = this.link = this.options.link || false;
      const entity = scope;
      const isNew = this.isNew = false === link;
      this.headerText = this.translate('Create Link', 'labels', 'Admin');
      if (!isNew) {
        this.headerText = this.translate('Edit Link', 'labels', 'Admin') + ' · ' + this.translate(scope, 'scopeNames') + ' · ' + this.translate(link, 'links', scope);
      }
      const model = this.model = new _model.default();
      model.name = 'EntityManager';
      this.model.set('entity', scope);
      const allEntityList = this.getMetadata().getScopeEntityList().filter(item => {
        const defs = /** @type {Record} */this.getMetadata().get(['scopes', item]) || {};
        if (!defs.customizable) {
          return false;
        }
        const emDefs = /** @type {Record} */defs.entityManager || {};
        if (emDefs.relationships === false) {
          return false;
        }
        return true;
      }).sort((v1, v2) => {
        const t1 = this.translate(v1, 'scopeNames');
        const t2 = this.translate(v2, 'scopeNames');
        return t1.localeCompare(t2);
      });
      let isCustom = true;
      let linkType;
      if (!isNew) {
        const entityForeign = this.getMetadata().get(`entityDefs.${scope}.links.${link}.entity`);
        const linkForeign = this.getMetadata().get(`entityDefs.${scope}.links.${link}.foreign`);
        const label = this.getLanguage().translate(link, 'links', scope);
        let labelForeign = this.getLanguage().translate(linkForeign, 'links', entityForeign);
        const type = this.getMetadata().get(`entityDefs.${entity}.links.${link}.type`);
        const foreignType = this.getMetadata().get(`entityDefs.${entityForeign}.links.${linkForeign}.type`);
        if (type === 'belongsToParent') {
          linkType = 'childrenToParent';
          labelForeign = null;
          let entityTypeList = this.getMetadata().get(['entityDefs', entity, 'fields', link, 'entityList']) || [];
          if (this.getMetadata().get(['entityDefs', entity, 'fields', link, 'entityList']) === null) {
            entityTypeList = allEntityList;
            this.noParentEntityTypeList = true;
          }
          this.model.set('parentEntityTypeList', entityTypeList);
          const foreignLinkEntityTypeList = this.getForeignLinkEntityTypeList(entity, link, entityTypeList);
          this.model.set('foreignLinkEntityTypeList', foreignLinkEntityTypeList);
        } else {
          linkType = _index.default.prototype.computeRelationshipType.call(this, type, foreignType);
        }
        this.model.set('linkType', linkType);
        this.model.set('entityForeign', entityForeign);
        this.model.set('link', link);
        this.model.set('linkForeign', linkForeign);
        this.model.set('label', label);
        this.model.set('labelForeign', labelForeign);
        const linkMultipleField = this.getMetadata().get(['entityDefs', scope, 'fields', link, 'type']) === 'linkMultiple' && !this.getMetadata().get(['entityDefs', scope, 'fields', link, 'noLoad']);
        const linkMultipleFieldForeign = this.getMetadata().get(['entityDefs', entityForeign, 'fields', linkForeign, 'type']) === 'linkMultiple' && !this.getMetadata().get(['entityDefs', entityForeign, 'fields', linkForeign, 'noLoad']);
        this.model.set('linkMultipleField', linkMultipleField);
        this.model.set('linkMultipleFieldForeign', linkMultipleFieldForeign);
        if (linkType === 'manyToMany') {
          const relationName = this.getMetadata().get(`entityDefs.${entity}.links.${link}.relationName`);
          this.model.set('relationName', relationName);
        }
        const audited = this.getMetadata().get(['entityDefs', scope, 'links', link, 'audited']) || false;
        const auditedForeign = this.getMetadata().get(['entityDefs', entityForeign, 'links', linkForeign, 'audited']) || false;
        this.model.set('audited', audited);
        this.model.set('auditedForeign', auditedForeign);
        const layout = this.getMetadata().get(`clientDefs.${scope}.relationshipPanels.${link}.layout`);
        const layoutForeign = this.getMetadata().get(`clientDefs.${entityForeign}.relationshipPanels.${linkForeign}.layout`);
        this.model.set('layout', layout);
        this.model.set('layoutForeign', layoutForeign);
        const selectFilter = this.getRelationshipPanelParam(scope, link, 'selectPrimaryFilterName');
        const selectFilterForeign = this.getRelationshipPanelParam(entityForeign, linkForeign, 'selectPrimaryFilterName');
        this.model.set('selectFilter', selectFilter);
        this.model.set('selectFilterForeign', selectFilterForeign);
        isCustom = this.getMetadata().get(`entityDefs.${entity}.links.${link}.isCustom`);
      }
      const scopes = this.getMetadata().get('scopes') || null;
      const entityList = (Object.keys(scopes) || []).filter(item => {
        const defs = /** @type {Record} */scopes[item] || {};
        if (!defs.entity || !defs.customizable) {
          return false;
        }
        const emDefs = /** @type {Record} */defs.entityManager || {};
        if (emDefs.relationships === false) {
          return false;
        }
        return true;
      }).sort((v1, v2) => {
        const t1 = this.translate(v1, 'scopeNames');
        const t2 = this.translate(v2, 'scopeNames');
        return t1.localeCompare(t2);
      });
      entityList.unshift('');
      this.createView('entity', 'views/fields/varchar', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="entity"]',
        defs: {
          name: 'entity'
        },
        readOnly: true
      });
      this.createView('entityForeign', 'views/fields/enum', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="entityForeign"]',
        defs: {
          name: 'entityForeign',
          params: {
            required: true,
            options: entityList,
            translation: 'Global.scopeNames'
          }
        },
        readOnly: !isNew
      });
      this.createView('linkType', 'views/fields/enum', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="linkType"]',
        defs: {
          name: 'linkType',
          params: {
            required: true,
            options: ['', 'oneToMany', 'manyToOne', 'manyToMany', 'oneToOneRight', 'oneToOneLeft', 'childrenToParent']
          }
        },
        readOnly: !isNew
      });
      this.createView('link', 'views/fields/varchar', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="link"]',
        defs: {
          name: 'link',
          params: {
            required: true,
            trim: true,
            maxLength: 61,
            noSpellCheck: true
          }
        },
        readOnly: !isNew
      });
      this.createView('linkForeign', 'views/fields/varchar', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="linkForeign"]',
        defs: {
          name: 'linkForeign',
          params: {
            required: true,
            trim: true,
            maxLength: 61,
            noSpellCheck: true
          }
        },
        readOnly: !isNew
      });
      this.createView('label', 'views/fields/varchar', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="label"]',
        defs: {
          name: 'label',
          params: {
            required: true,
            trim: true
          }
        }
      });
      this.createView('labelForeign', 'views/fields/varchar', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="labelForeign"]',
        defs: {
          name: 'labelForeign',
          params: {
            required: true,
            trim: true
          }
        }
      });
      if (isNew || this.model.get('relationName')) {
        this.createView('relationName', 'views/fields/varchar', {
          model: model,
          mode: 'edit',
          selector: '.field[data-name="relationName"]',
          defs: {
            name: 'relationName',
            params: {
              required: true,
              trim: true,
              maxLength: 61,
              noSpellCheck: true
            }
          },
          readOnly: !isNew
        });
      }
      this.createView('linkMultipleField', 'views/fields/bool', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="linkMultipleField"]',
        defs: {
          name: 'linkMultipleField'
        },
        readOnly: !isCustom,
        tooltip: true,
        tooltipText: this.translate('linkMultipleField', 'tooltips', 'EntityManager')
      });
      this.createView('linkMultipleFieldForeign', 'views/fields/bool', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="linkMultipleFieldForeign"]',
        defs: {
          name: 'linkMultipleFieldForeign'
        },
        readOnly: !isCustom,
        tooltip: true,
        tooltipText: this.translate('linkMultipleField', 'tooltips', 'EntityManager')
      });
      this.createView('audited', 'views/fields/bool', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="audited"]',
        defs: {
          name: 'audited'
        },
        tooltip: true,
        tooltipText: this.translate('linkAudited', 'tooltips', 'EntityManager')
      });
      this.createView('auditedForeign', 'views/fields/bool', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="auditedForeign"]',
        defs: {
          name: 'auditedForeign'
        },
        tooltip: true,
        tooltipText: this.translate('linkAudited', 'tooltips', 'EntityManager')
      });
      const layouts = ['', ...this.getEntityTypeLayouts(this.scope)];
      const layoutTranslatedOptions = this.getEntityTypeLayoutsTranslations(this.scope);
      this.layoutFieldView = new _enum.default({
        name: 'layout',
        model: model,
        mode: 'edit',
        defs: {
          name: 'layout'
        },
        params: {
          options: ['']
        },
        translatedOptions: {
          '': this.translate('Default')
        }
      });
      this.layoutForeignFieldView = new _enum.default({
        name: 'layoutForeign',
        model: model,
        mode: 'edit',
        defs: {
          name: 'layoutForeign'
        },
        params: {
          options: layouts
        },
        translatedOptions: layoutTranslatedOptions
      });
      this.assignView('layout', this.layoutFieldView, '.field[data-name="layout"]');
      this.assignView('layoutForeign', this.layoutForeignFieldView, '.field[data-name="layoutForeign"]');
      this.selectFilterFieldView = new _enum.default({
        name: 'selectFilter',
        model: model,
        mode: 'edit',
        defs: {
          name: 'selectFilter'
        },
        params: {
          options: ['']
        },
        translatedOptions: {
          '': this.translate('all', 'presetFilters')
        },
        tooltip: true,
        tooltipText: this.translate('linkSelectFilter', 'tooltips', 'EntityManager')
      });
      this.selectFilterForeignFieldView = new _enum.default({
        name: 'selectFilterForeign',
        model: model,
        mode: 'edit',
        defs: {
          name: 'selectFilterForeign'
        },
        params: {
          options: ['', ...this.getEntityTypeFilters(this.scope)]
        },
        translatedOptions: this.getEntityTypeFiltersTranslations(this.scope),
        tooltip: true,
        tooltipText: this.translate('linkSelectFilter', 'tooltips', 'EntityManager')
      });
      this.assignView('selectFilter', this.selectFilterFieldView, '.field[data-name="selectFilter"]');
      this.assignView('selectFilterForeign', this.selectFilterForeignFieldView, '.field[data-name="selectFilterForeign"]');
      this.createView('parentEntityTypeList', 'views/fields/entity-type-list', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="parentEntityTypeList"]',
        defs: {
          name: 'parentEntityTypeList'
        }
      });
      this.createView('foreignLinkEntityTypeList', 'views/admin/link-manager/fields/foreign-link-entity-type-list', {
        model: model,
        mode: 'edit',
        selector: '.field[data-name="foreignLinkEntityTypeList"]',
        defs: {
          name: 'foreignLinkEntityTypeList',
          params: {
            options: this.model.get('parentEntityTypeList') || []
          }
        }
      });
      this.model.fetchedAttributes = this.model.getClonedAttributes();
      this.listenTo(this.model, 'change', () => {
        if (!this.model.hasChanged('parentEntityTypeList') && !this.model.hasChanged('linkForeign') && !this.model.hasChanged('link')) {
          return;
        }
        const view = /** @type {import('views/fields/enum').default} */
        this.getView('foreignLinkEntityTypeList');
        if (view && !this.noParentEntityTypeList) {
          view.setOptionList(this.model.get('parentEntityTypeList') || []);
        }
        const checkedList = Espo.Utils.clone(this.model.get('foreignLinkEntityTypeList') || []);
        this.getForeignLinkEntityTypeList(this.model.get('entity'), this.model.get('link'), this.model.get('parentEntityTypeList') || [], true).forEach(item => {
          if (!~checkedList.indexOf(item)) {
            checkedList.push(item);
          }
        });
        this.model.set('foreignLinkEntityTypeList', checkedList);
      });
      this.controlLayoutField();
      this.listenTo(this.model, 'change:entityForeign', () => this.controlLayoutField());
      this.controlFilterField();
      this.listenTo(this.model, 'change:entityForeign', () => this.controlFilterField());
    }
    getEntityTypeLayouts(entityType) {
      const defs = this.getMetadata().get(['clientDefs', entityType, 'additionalLayouts'], {});
      return Object.keys(defs).filter(item => ['list', 'listSmall'].includes(defs[item].type));
    }
    getEntityTypeLayoutsTranslations(entityType) {
      const map = {};
      this.getEntityTypeLayouts(entityType).forEach(item => {
        map[item] = this.getLanguage().has(item, 'layouts', entityType) ? this.getLanguage().translate(item, 'layouts', entityType) : this.getLanguage().translate(item, 'layouts', 'Admin');
      });
      map[''] = this.translate('Default');
      return map;
    }
    getEntityTypeFiltersTranslations(entityType) {
      const map = {};
      this.getEntityTypeFilters(entityType).forEach(item => {
        map[item] = this.getLanguage().translate(item, 'presetFilters', entityType);
      });
      map[''] = this.translate('all', 'presetFilters');
      return map;
    }

    /**
     * @param {string} entityType
     * @return {string[]}
     */
    getEntityTypeFilters(entityType) {
      return this.getMetadata().get(`clientDefs.${entityType}.filterList`, []).map(item => {
        if (typeof item === 'string') {
          return item;
        }
        return item.name;
      });
    }
    controlLayoutField() {
      const foreignEntityType = this.model.get('entityForeign');
      const layouts = foreignEntityType ? ['', ...this.getEntityTypeLayouts(foreignEntityType)] : [''];
      this.layoutFieldView.translatedOptions = foreignEntityType ? this.getEntityTypeLayoutsTranslations(foreignEntityType) : {};
      this.layoutFieldView.setOptionList(layouts).then(() => this.layoutFieldView.reRender());
    }
    controlFilterField() {
      const foreignEntityType = this.model.get('entityForeign');
      const layouts = foreignEntityType ? ['', ...this.getEntityTypeFilters(foreignEntityType)] : [''];
      this.selectFilterFieldView.translatedOptions = foreignEntityType ? this.getEntityTypeFiltersTranslations(foreignEntityType) : {};
      this.selectFilterFieldView.setOptionList(layouts).then(() => this.selectFilterFieldView.reRender());
    }
    toPlural(string) {
      if (string.slice(-1) === 'y') {
        return string.substr(0, string.length - 1) + 'ies';
      }
      if (string.slice(-1) === 's') {
        return string.substr(0, string.length) + 'es';
      }
      return string + 's';
    }
    populateFields() {
      const entityForeign = this.model.get('entityForeign');
      const linkType = this.model.get('linkType');
      let link;
      let linkForeign;
      if (linkType === 'childrenToParent') {
        this.model.set('link', 'parent');
        this.model.set('label', 'Parent');
        linkForeign = this.entityTypeToLink(this.scope, true);
        if (this.getMetadata().get(['entityDefs', this.scope, 'links', 'parent'])) {
          this.model.set('link', 'parentAnother');
          this.model.set('label', 'Parent Another');
          linkForeign += 'Another';
        }
        this.model.set('linkForeign', linkForeign);
        this.model.set('labelForeign', null);
        this.model.set('entityForeign', null);
        return;
      } else {
        if (!entityForeign || !linkType) {
          this.model.set('link', null);
          this.model.set('linkForeign', null);
          this.model.set('label', null);
          this.model.set('labelForeign', null);
          return;
        }
      }
      switch (linkType) {
        case 'oneToMany':
          linkForeign = this.entityTypeToLink(this.scope);
          link = this.entityTypeToLink(entityForeign, true);
          if (entityForeign === this.scope) {
            linkForeign = linkForeign + 'Parent';
          }
          break;
        case 'manyToOne':
          linkForeign = this.entityTypeToLink(this.scope, true);
          link = this.entityTypeToLink(entityForeign);
          if (entityForeign === this.scope) {
            link = link + 'Parent';
          }
          break;
        case 'manyToMany':
          linkForeign = this.entityTypeToLink(this.scope, true);
          link = this.entityTypeToLink(entityForeign, true);
          if (link === linkForeign) {
            link = link + 'Right';
            linkForeign = linkForeign + 'Left';
          }
          const entityStripped = this.stripPrefixFromCustomEntityType(this.scope);
          const entityForeignStripped = this.stripPrefixFromCustomEntityType(entityForeign);
          const relationName = entityStripped.localeCompare(entityForeignStripped) ? Espo.Utils.lowerCaseFirst(entityStripped) + entityForeignStripped : Espo.Utils.lowerCaseFirst(entityForeignStripped) + entityStripped;
          this.model.set('relationName', relationName);
          break;
        case 'oneToOneLeft':
          linkForeign = this.entityTypeToLink(this.scope);
          link = this.entityTypeToLink(entityForeign);
          if (entityForeign === this.scope) {
            if (linkForeign === Espo.Utils.lowerCaseFirst(this.scope)) {
              link = link + 'Parent';
            }
          }
          break;
        case 'oneToOneRight':
          linkForeign = this.entityTypeToLink(this.scope);
          link = this.entityTypeToLink(entityForeign);
          if (entityForeign === this.scope) {
            if (linkForeign === Espo.Utils.lowerCaseFirst(this.scope)) {
              linkForeign = linkForeign + 'Parent';
            }
          }
          break;
      }
      let number = 1;
      while (this.getMetadata().get(['entityDefs', this.scope, 'links', link])) {
        link += number.toString();
        number++;
      }
      number = 1;
      while (this.getMetadata().get(['entityDefs', entityForeign, 'links', linkForeign])) {
        linkForeign += number.toString();
        number++;
      }
      this.model.set('link', link);
      this.model.set('linkForeign', linkForeign);
      let label = Espo.Utils.upperCaseFirst(link.replace(/([a-z])([A-Z])/g, '$1 $2'));
      let labelForeign = Espo.Utils.upperCaseFirst(linkForeign.replace(/([a-z])([A-Z])/g, '$1 $2'));
      if (label.startsWith('C ')) {
        label = label.substring(2);
      }
      if (labelForeign.startsWith('C ')) {
        labelForeign = labelForeign.substring(2);
      }

      // @todo Use entity labels as initial link labels?

      this.model.set('label', label || null);
      this.model.set('labelForeign', labelForeign || null);
    }

    /**
     * @private
     * @param {string} entityType
     * @param {boolean} plural
     * @return {string}
     */
    entityTypeToLink(entityType, plural = false) {
      let string = this.stripPrefixFromCustomEntityType(entityType);
      string = Espo.Utils.lowerCaseFirst(string);
      if (plural) {
        string = this.toPlural(string);
      }
      return string;
    }

    /**
     * @private
     * @param {string} entityType
     * @return {string}
     */
    stripPrefixFromCustomEntityType(entityType) {
      let string = entityType;
      if (this.getMetadata().get(`scopes.${entityType}.isCustom`) && entityType[0] === 'C' && /[A-Z]/.test(entityType[1])) {
        string = string.substring(1);
      }
      return string;
    }
    handleLinkChange(field) {
      let value = this.model.get(field);
      if (value) {
        value = value.replace(/-/g, ' ').replace(/_/g, ' ').replace(/[^\w\s]/gi, '').replace(/ (.)/g, (match, g) => {
          return g.toUpperCase();
        }).replace(' ', '');
        if (value.length) {
          value = Espo.Utils.lowerCaseFirst(value);
        }
      }
      this.model.set(field, value);
    }
    hideField(name) {
      const view = this.getView(name);
      if (view) {
        view.disabled = true;
      }
      this.$el.find('.cell[data-name=' + name + ']').addClass('hidden-cell');
    }
    showField(name) {
      const view = this.getView(name);
      if (view) {
        view.disabled = false;
      }
      this.$el.find('.cell[data-name=' + name + ']').removeClass('hidden-cell');
    }
    handleLinkTypeChange() {
      const linkType = this.model.get('linkType');
      this.showField('entityForeign');
      this.showField('labelForeign');
      this.hideField('parentEntityTypeList');
      this.hideField('foreignLinkEntityTypeList');
      if (linkType === 'manyToMany') {
        this.showField('relationName');
        this.showField('linkMultipleField');
        this.showField('linkMultipleFieldForeign');
        this.showField('audited');
        this.showField('auditedForeign');
        this.showField('layout');
        this.showField('layoutForeign');
        this.showField('selectFilter');
        this.showField('selectFilterForeign');
      } else {
        this.hideField('relationName');
        if (linkType === 'oneToMany') {
          this.showField('linkMultipleField');
          this.hideField('linkMultipleFieldForeign');
          this.showField('audited');
          this.hideField('auditedForeign');
          this.showField('layout');
          this.hideField('layoutForeign');
          this.showField('selectFilter');
          this.showField('selectFilterForeign');
        } else if (linkType === 'manyToOne') {
          this.hideField('linkMultipleField');
          this.showField('linkMultipleFieldForeign');
          this.hideField('audited');
          this.showField('auditedForeign');
          this.hideField('layout');
          this.showField('layoutForeign');
          this.showField('selectFilter');
          this.showField('selectFilterForeign');
        } else {
          this.hideField('linkMultipleField');
          this.hideField('linkMultipleFieldForeign');
          this.hideField('audited');
          this.hideField('auditedForeign');
          this.hideField('layout');
          this.hideField('layoutForeign');
          if (linkType === 'parentToChildren') {
            this.showField('audited');
            this.hideField('auditedForeign');
            this.showField('layout');
            this.hideField('layoutForeign');
            this.hideField('selectFilter');
            this.hideField('selectFilterForeign');
          } else if (linkType === 'childrenToParent') {
            this.hideField('audited');
            this.showField('auditedForeign');
            this.hideField('layout');
            this.hideField('layoutForeign');
            this.hideField('entityForeign');
            this.hideField('labelForeign');
            this.hideField('selectFilter');
            this.hideField('selectFilterForeign');
            if (!this.noParentEntityTypeList) {
              this.showField('parentEntityTypeList');
            }
            if (!this.model.get('linkForeign')) {
              this.hideField('foreignLinkEntityTypeList');
            } else {
              this.showField('foreignLinkEntityTypeList');
            }
          } else {
            this.hideField('audited');
            this.hideField('auditedForeign');
            this.hideField('layout');
            this.hideField('layoutForeign');
            if (linkType) {
              this.showField('selectFilter');
              this.showField('selectFilterForeign');
            } else {
              this.hideField('selectFilter');
              this.hideField('selectFilterForeign');
            }
          }
        }
      }
      if (!this.getMetadata().get(['scopes', this.scope, 'stream'])) {
        this.hideField('audited');
      }
      if (!this.getMetadata().get(['scopes', this.model.get('entityForeign'), 'stream'])) {
        this.hideField('auditedForeign');
      }
    }
    afterRender() {
      this.handleLinkTypeChange();
      this.getView('linkType').on('change', () => {
        this.handleLinkTypeChange();
        this.populateFields();
      });
      this.getView('entityForeign').on('change', () => {
        this.populateFields();
      });
      this.getView('link').on('change', () => {
        this.handleLinkChange('link');
      });
      this.getView('linkForeign').on('change', () => {
        this.handleLinkChange('linkForeign');
      });
    }

    /**
     * @param {{noClose?: boolean}} [options]
     */
    save(options) {
      options = options || {};
      const arr = ['link', 'linkForeign', 'label', 'labelForeign', 'linkType', 'entityForeign', 'relationName', 'linkMultipleField', 'linkMultipleFieldForeign', 'audited', 'auditedForeign', 'layout', 'layoutForeign', 'selectFilter', 'selectFilterForeign', 'parentEntityTypeList', 'foreignLinkEntityTypeList'];
      let notValid = false;
      arr.forEach(item => {
        if (!this.hasView(item)) {
          return;
        }
        const view = /** @type {import('views/fields/base').default} */
        this.getView(item);
        if (view.mode !== 'edit') {
          return;
        }
        view.fetchToModel();
      });
      arr.forEach(item => {
        if (!this.hasView(item)) {
          return;
        }
        const view = /** @type {import('views/fields/base').default} */
        this.getView(item);
        if (view.mode !== 'edit') {
          return;
        }
        if (!view.disabled) {
          notValid = view.validate() || notValid;
        }
      });
      if (notValid) {
        return;
      }
      this.$el.find('button[data-name="save"]').addClass('disabled').attr('disabled');
      let url = 'EntityManager/action/createLink';
      if (!this.isNew) {
        url = 'EntityManager/action/updateLink';
      }
      const entity = this.scope;
      const entityForeign = this.model.get('entityForeign');
      const link = this.model.get('link');
      const linkForeign = this.model.get('linkForeign');
      const label = this.model.get('label');
      const labelForeign = this.model.get('labelForeign');
      const relationName = this.model.get('relationName');
      const linkMultipleField = this.model.get('linkMultipleField');
      const linkMultipleFieldForeign = this.model.get('linkMultipleFieldForeign');
      const audited = this.model.get('audited');
      const auditedForeign = this.model.get('auditedForeign');
      const layout = this.model.get('layout');
      const layoutForeign = this.model.get('layoutForeign');
      const linkType = this.model.get('linkType');
      const attributes = {
        entity: entity,
        entityForeign: entityForeign,
        link: link,
        linkForeign: linkForeign,
        label: label,
        labelForeign: labelForeign,
        linkType: linkType,
        relationName: relationName,
        linkMultipleField: linkMultipleField,
        linkMultipleFieldForeign: linkMultipleFieldForeign,
        audited: audited,
        auditedForeign: auditedForeign,
        layout: layout,
        layoutForeign: layoutForeign,
        selectFilter: this.model.get('selectFilter'),
        selectFilterForeign: this.model.get('selectFilterForeign')
      };
      if (!this.isNew) {
        if (attributes.label === this.model.fetchedAttributes.label) {
          delete attributes.label;
        }
        if (attributes.labelForeign === this.model.fetchedAttributes.labelForeign) {
          delete attributes.labelForeign;
        }
      }
      if (linkType === 'childrenToParent') {
        delete attributes.entityForeign;
        delete attributes.labelForeign;
        attributes.parentEntityTypeList = this.model.get('parentEntityTypeList');
        attributes.foreignLinkEntityTypeList = this.model.get('foreignLinkEntityTypeList');
        if (this.noParentEntityTypeList) {
          attributes.parentEntityTypeList = null;
        }
        delete attributes.selectFilter;
        delete attributes.selectFilterForeign;
      }
      if (linkType === 'parentToChildren') {
        delete attributes.selectFilter;
        delete attributes.selectFilterForeign;
      }
      Espo.Ajax.postRequest(url, attributes).then(() => {
        if (!this.isNew) {
          Espo.Ui.success(this.translate('Saved'));
        } else {
          Espo.Ui.success(this.translate('Created'));
        }
        this.model.fetchedAttributes = this.model.getClonedAttributes();
        Promise.all([this.getMetadata().loadSkipCache(), this.getLanguage().loadSkipCache()]).then(() => {
          this.broadcastUpdate();
          this.trigger('after:save');
          if (!options.noClose) {
            this.close();
          }
          if (options.noClose) {
            this.$el.find('button[data-name="save"]').removeClass('disabled').removeAttr('disabled');
          }
        });
      }).catch(xhr => {
        if (xhr.status === 409) {
          const msg = this.translate('linkConflict', 'messages', 'EntityManager');
          const statusReasonHeader = xhr.getResponseHeader('X-Status-Reason');
          if (statusReasonHeader) {
            console.error(statusReasonHeader);
          }
          Espo.Ui.error(msg);
          xhr.errorIsHandled = true;
        }
        this.$el.find('button[data-name="save"]').removeClass('disabled').removeAttr('disabled');
      });
    }
    getForeignLinkEntityTypeList(entityType, link, entityTypeList, onlyNotCustom) {
      const list = [];
      entityTypeList.forEach(item => {
        const linkDefs = /** @type {Object.<string, Record>} */
        this.getMetadata().get(['entityDefs', item, 'links']) || {};
        let isFound = false;
        for (const i in linkDefs) {
          if (linkDefs[i].foreign === link && linkDefs[i].entity === entityType && linkDefs[i].type === 'hasChildren') {
            if (onlyNotCustom) {
              if (linkDefs[i].isCustom) {
                continue;
              }
            }
            isFound = true;
            break;
          }
        }
        if (isFound) {
          list.push(item);
        }
      });
      return list;
    }

    /**
     * @param {string} entityType
     * @param {string} link
     * @param {string} param
     * @return {*}
     */
    getRelationshipPanelParam(entityType, link, param) {
      return this.getMetadata().get(`clientDefs.${entityType}.relationshipPanels.${link}.${param}`);
    }
    broadcastUpdate() {
      this.getHelper().broadcastChannel.postMessage('update:metadata');
      this.getHelper().broadcastChannel.postMessage('update:language');
    }
  }
  var _default = _exports.default = LinkManagerEditModalView;
});

define("views/admin/link-manager/fields/foreign-link-entity-type-list", ["exports", "views/fields/checklist"], function (_exports, _checklist) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _checklist = _interopRequireDefault(_checklist);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _checklist.default {
    setup() {
      this.params.translation = 'Global.scopeNames';
      super.setup();
    }
    afterRender() {
      super.afterRender();
      this.controlOptionsAvailability();
    }
    controlOptionsAvailability() {
      this.params.options.forEach(item => {
        const link = this.model.get('link');
        const linkForeign = this.model.get('linkForeign');
        const entityType = this.model.get('entity');
        const linkDefs = this.getMetadata().get(['entityDefs', item, 'links']) || {};
        let isFound = false;
        for (const i in linkDefs) {
          if (linkDefs[i].foreign === link && !linkDefs[i].isCustom && linkDefs[i].entity === entityType) {
            isFound = true;
          } else if (i === linkForeign && linkDefs[i].type !== 'hasChildren') {
            isFound = true;
          }
        }
        if (isFound) {
          this.$el.find(`input[data-name="checklistItem-foreignLinkEntityTypeList-${item}"]`).attr('disabled', 'disabled');
        }
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/layouts/side-panels-edit", ["exports", "views/admin/layouts/side-panels-detail"], function (_exports, _sidePanelsDetail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _sidePanelsDetail = _interopRequireDefault(_sidePanelsDetail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _sidePanelsDetail.default {
    viewType = 'edit';
  }
  _exports.default = _default;
});

define("views/admin/layouts/side-panels-edit-small", ["exports", "views/admin/layouts/side-panels-detail"], function (_exports, _sidePanelsDetail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _sidePanelsDetail = _interopRequireDefault(_sidePanelsDetail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _sidePanelsDetail.default {
    viewType = 'editSmall';
  }
  _exports.default = _default;
});

define("views/admin/layouts/side-panels-detail-small", ["exports", "views/admin/layouts/side-panels-detail"], function (_exports, _sidePanelsDetail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _sidePanelsDetail = _interopRequireDefault(_sidePanelsDetail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _sidePanelsDetail.default {
    viewType = 'detailSmall';
  }
  _exports.default = _default;
});

/************************************************************************
 * This file is part of EspoCRM.
 *
 * EspoCRM – Open Source CRM application.
 * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
 * Website: https://www.espocrm.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * The interactive user interfaces in modified source and object code versions
 * of this program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU Affero General Public License version 3.
 *
 * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
 * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
 ************************************************************************/

/**
 * @deprecated
 */
define('views/admin/layouts/relationships', ['views/admin/layouts/rows'], function (Dep) {

    return Dep.extend({

        dataAttributeList: [
            'name',
            'dynamicLogicVisible',
            'style',
            'dynamicLogicStyled',
        ],

        editable: true,

        dataAttributesDefs: {
            style: {
                type: 'enum',
                options: [
                    'default',
                    'success',
                    'danger',
                    'warning',
                    'info',
                ],
                translation: 'LayoutManager.options.style',
            },
            dynamicLogicVisible: {
                type: 'base',
                view: 'views/admin/field-manager/fields/dynamic-logic-conditions',
                tooltip: 'dynamicLogicVisible',
            },
            dynamicLogicStyled: {
                type: 'base',
                view: 'views/admin/field-manager/fields/dynamic-logic-conditions',
                tooltip: 'dynamicLogicStyled',
            },
            name: {
                readOnly: true,
            },
        },

        languageCategory: 'links',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.dataAttributesDefs = Espo.Utils.cloneDeep(this.dataAttributesDefs);

            this.dataAttributesDefs.dynamicLogicVisible.scope = this.scope;
            this.dataAttributesDefs.dynamicLogicStyled.scope = this.scope;

            this.wait(true);

            this.loadLayout(() => {
                this.wait(false);
            });
        },

        loadLayout: function (callback) {
            this.getModelFactory().create(this.scope, (model) => {
                this.getHelper().layoutManager.getOriginal(this.scope, this.type, this.setId, (layout) => {

                    let allFields = [];

                    for (let field in model.defs.links) {
                        if (['hasMany', 'hasChildren'].indexOf(model.defs.links[field].type) !== -1) {
                            if (this.isLinkEnabled(model, field)) {
                                allFields.push(field);
                            }
                        }
                    }

                    allFields.sort((v1, v2) => {
                        return this.translate(v1, 'links', this.scope)
                            .localeCompare(this.translate(v2, 'links', this.scope));
                    });

                    allFields.push('_delimiter_');

                    this.enabledFieldsList = [];

                    this.enabledFields = [];
                    this.disabledFields = [];

                    for (let i in layout) {
                        let item = layout[i];
                        let o;

                        if (typeof item == 'string' || item instanceof String) {
                            o = {
                                name: item,
                                labelText: this.getLanguage().translate(item, 'links', this.scope)
                            };
                        }
                        else {
                            o = item;

                            o.labelText = this.getLanguage().translate(o.name, 'links', this.scope);
                        }

                        if (o.name[0] === '_') {
                            o.notEditable = true;

                            if (o.name === '_delimiter_') {
                                o.labelText = '. . .';
                            }
                        }

                        this.dataAttributeList.forEach(attribute => {
                            if (attribute === 'name') {
                                return;
                            }

                            if (attribute in o) {
                                return;
                            }

                            var value = this.getMetadata()
                                .get(['clientDefs', this.scope, 'relationshipPanels', o.name, attribute]);

                            if (value === null) {
                                return;
                            }

                            o[attribute] = value;
                        });

                        this.enabledFields.push(o);
                        this.enabledFieldsList.push(o.name);
                    }

                    for (let i in allFields) {
                        if (!_.contains(this.enabledFieldsList, allFields[i])) {
                            var name = allFields[i];

                            var label = this.getLanguage().translate(name, 'links', this.scope);

                            let o = {
                                name: name,
                                labelText: label,
                            };

                            if (o.name[0] === '_') {
                                o.notEditable = true;

                                if (o.name === '_delimiter_') {
                                    o.labelText = '. . .';
                                }
                            }

                            this.disabledFields.push(o);
                        }
                    }

                    this.rowLayout = this.enabledFields;

                    for (let i in this.rowLayout) {
                        let o = this.rowLayout[i];

                        o.labelText = this.getLanguage().translate(this.rowLayout[i].name, 'links', this.scope);

                        if (o.name === '_delimiter_') {
                            o.labelText = '. . .';
                        }

                        this.itemsData[this.rowLayout[i].name] = Espo.Utils.cloneDeep(this.rowLayout[i]);
                    }

                    callback();
                });
            });
        },

        validate: function () {
            return true;
        },

        isLinkEnabled: function (model, name) {
            return !model.getLinkParam(name, 'disabled') &&
                !model.getLinkParam(name, 'utility') &&
                !model.getLinkParam(name, 'layoutRelationshipsDisabled');
        },
    });
});

define("views/admin/layouts/mass-update", ["exports", "views/admin/layouts/rows"], function (_exports, _rows) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _rows = _interopRequireDefault(_rows);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutMassUpdateView extends _rows.default {
    dataAttributeList = ['name'];
    editable = false;
    ignoreList = [];
    ignoreTypeList = ['duration'];
    dataAttributesDefs = {
      name: {
        readOnly: true
      }
    };
    setup() {
      super.setup();
      this.wait(true);
      this.loadLayout(() => {
        this.wait(false);
      });
    }
    loadLayout(callback) {
      this.getModelFactory().create(this.scope, model => {
        this.getHelper().layoutManager.getOriginal(this.scope, this.type, this.setId, layout => {
          const allFields = [];
          for (const field in model.defs.fields) {
            if (!model.getFieldParam(field, 'massUpdateDisabled') && !model.getFieldParam(field, 'readOnly') && this.isFieldEnabled(model, field)) {
              allFields.push(field);
            }
          }
          allFields.sort((v1, v2) => {
            return this.translate(v1, 'fields', this.scope).localeCompare(this.translate(v2, 'fields', this.scope));
          });
          this.enabledFieldsList = [];
          this.enabledFields = [];
          this.disabledFields = [];
          for (const i in layout) {
            this.enabledFields.push({
              name: layout[i],
              labelText: this.getLanguage().translate(layout[i], 'fields', this.scope)
            });
            this.enabledFieldsList.push(layout[i]);
          }
          for (const i in allFields) {
            if (!_.contains(this.enabledFieldsList, allFields[i])) {
              this.disabledFields.push({
                name: allFields[i],
                labelText: this.getLanguage().translate(allFields[i], 'fields', this.scope)
              });
            }
          }
          this.rowLayout = this.enabledFields;
          for (const i in this.rowLayout) {
            this.rowLayout[i].labelText = this.getLanguage().translate(this.rowLayout[i].name, 'fields', this.scope);
            this.itemsData[this.rowLayout[i].name] = Espo.Utils.cloneDeep(this.rowLayout[i]);
          }
          callback();
        });
      });
    }
    fetch() {
      const layout = [];
      $("#layout ul.enabled > li").each((i, el) => {
        layout.push($(el).data('name'));
      });
      return layout;
    }
    validate() {
      return true;
    }
    isFieldEnabled(model, name) {
      if (this.ignoreList.indexOf(name) !== -1) {
        return false;
      }
      if (this.ignoreTypeList.indexOf(model.getFieldParam(name, 'type')) !== -1) {
        return false;
      }
      const layoutList = model.getFieldParam(name, 'layoutAvailabilityList');
      if (layoutList && !layoutList.includes(this.type)) {
        return;
      }
      const layoutIgnoreList = model.getFieldParam(name, 'layoutIgnoreList') || [];
      if (layoutIgnoreList.includes(this.type)) {
        return false;
      }
      return !model.getFieldParam(name, 'disabled') && !model.getFieldParam(name, 'utility') && !model.getFieldParam(name, 'layoutMassUpdateDisabled') && !model.getFieldParam(name, 'readOnly');
    }
  }
  var _default = _exports.default = LayoutMassUpdateView;
});

define("views/admin/layouts/list-small", ["exports", "views/admin/layouts/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    /**
     * @protected
     * @type {number}
     */
    defaultWidth = 20;
  }
  _exports.default = _default;
});

define("views/admin/layouts/kanban", ["exports", "views/admin/layouts/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutKanbanView extends _list.default {
    dataAttributeList = ['name', 'link', 'align', 'view', 'isLarge', 'isMuted', 'hidden'];
    dataAttributesDefs = {
      link: {
        type: 'bool'
      },
      isLarge: {
        type: 'bool'
      },
      isMuted: {
        type: 'bool'
      },
      width: {
        type: 'float'
      },
      align: {
        type: 'enum',
        options: ['left', 'right']
      },
      view: {
        type: 'varchar',
        readOnly: true
      },
      name: {
        type: 'varchar',
        readOnly: true
      },
      hidden: {
        type: 'bool'
      }
    };
    editable = true;
    ignoreList = [];
    ignoreTypeList = [];
  }
  var _default = _exports.default = LayoutKanbanView;
});

define("views/admin/layouts/filters", ["exports", "views/admin/layouts/rows"], function (_exports, _rows) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _rows = _interopRequireDefault(_rows);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutFiltersView extends _rows.default {
    dataAttributeList = ['name'];
    editable = false;
    ignoreList = [];
    setup() {
      super.setup();
      this.wait(true);
      this.loadLayout(() => this.wait(false));
    }
    loadLayout(callback) {
      this.getModelFactory().create(this.scope, model => {
        this.getHelper().layoutManager.getOriginal(this.scope, this.type, this.setId, layout => {
          const allFields = [];
          for (const field in model.defs.fields) {
            if (this.checkFieldType(model.getFieldParam(field, 'type')) && this.isFieldEnabled(model, field)) {
              allFields.push(field);
            }
          }
          allFields.sort((v1, v2) => {
            return this.translate(v1, 'fields', this.scope).localeCompare(this.translate(v2, 'fields', this.scope));
          });
          this.enabledFieldsList = [];
          this.enabledFields = [];
          this.disabledFields = [];
          for (const item of layout) {
            this.enabledFields.push({
              name: item,
              labelText: this.getLanguage().translate(item, 'fields', this.scope)
            });
            this.enabledFieldsList.push(item);
          }
          for (const item of allFields) {
            if (!this.enabledFieldsList.includes(item)) {
              this.disabledFields.push({
                name: item,
                labelText: this.getLanguage().translate(item, 'fields', this.scope)
              });
            }
          }

          /** @type {Object[]} */
          this.rowLayout = this.enabledFields;
          for (const item of this.rowLayout) {
            item.labelText = this.getLanguage().translate(item.name, 'fields', this.scope);
          }
          callback();
        });
      });
    }
    fetch() {
      const layout = [];
      $("#layout ul.enabled > li").each((i, el) => {
        layout.push($(el).data('name'));
      });
      return layout;
    }
    checkFieldType(type) {
      return this.getFieldManager().checkFilter(type);
    }
    validate() {
      return true;
    }
    isFieldEnabled(model, name) {
      if (this.ignoreList.indexOf(name) !== -1) {
        return false;
      }
      return !model.getFieldParam(name, 'disabled') && !model.getFieldParam(name, 'utility') && !model.getFieldParam(name, 'layoutFiltersDisabled');
    }
  }
  var _default = _exports.default = LayoutFiltersView;
});

define("views/admin/layouts/detail-small", ["exports", "views/admin/layouts/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {}
  _exports.default = _default;
});

define("views/admin/layouts/detail-convert", ["exports", "views/admin/layouts/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _detail.default {}
  _exports.default = _default;
});

define("views/admin/layouts/default-side-panel", ["exports", "views/admin/layouts/rows"], function (_exports, _rows) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _rows = _interopRequireDefault(_rows);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutDefaultSidePanel extends _rows.default {
    dataAttributeList = ['name', 'view', 'customLabel'];
    dataAttributesDefs = {
      view: {
        type: 'varchar',
        readOnly: true
      },
      customLabel: {
        type: 'varchar',
        readOnly: true
      },
      name: {
        type: 'varchar',
        readOnly: true
      }
    };
    editable = false;
    languageCategory = 'fields';
    setup() {
      super.setup();
      this.wait(true);
      this.loadLayout(() => {
        this.wait(false);
      });
    }
    validate() {
      return true;
    }
    loadLayout(callback) {
      this.getModelFactory().create(Espo.Utils.hyphenToUpperCamelCase(this.scope), model => {
        this.getHelper().layoutManager.getOriginal(this.scope, this.type, this.setId, layout => {
          this.readDataFromLayout(model, layout);
          if (callback) {
            callback();
          }
        });
      });
    }
    readDataFromLayout(model, layout) {
      const allFields = [];
      for (const field in model.defs.fields) {
        if (this.checkFieldType(model.getFieldParam(field, 'type')) && this.isFieldEnabled(model, field)) {
          allFields.push(field);
        }
      }
      allFields.sort((v1, v2) => {
        return this.translate(v1, 'fields', this.scope).localeCompare(this.translate(v2, 'fields', this.scope));
      });
      if (~allFields.indexOf('assignedUser')) {
        allFields.unshift(':assignedUser');
      }
      this.enabledFieldsList = [];
      this.enabledFields = [];
      this.disabledFields = [];
      const labelList = [];
      const duplicateLabelList = [];
      for (let i = 0; i < layout.length; i++) {
        let item = layout[i];
        if (typeof item !== 'object') {
          item = {
            name: item
          };
        }
        let realName = item.name;
        if (realName.indexOf(':') === 0) realName = realName.substr(1);
        let label = this.getLanguage().translate(realName, 'fields', this.scope);
        if (realName !== item.name) {
          label = label + ' *';
        }
        if (~labelList.indexOf(label)) {
          duplicateLabelList.push(label);
        }
        labelList.push(label);
        this.enabledFields.push({
          name: item.name,
          labelText: label
        });
        this.enabledFieldsList.push(item.name);
      }
      for (let i = 0; i < allFields.length; i++) {
        if (!_.contains(this.enabledFieldsList, allFields[i])) {
          let label = this.getLanguage().translate(allFields[i], 'fields', this.scope);
          if (~labelList.indexOf(label)) {
            duplicateLabelList.push(label);
          }
          labelList.push(label);
          const fieldName = allFields[i];
          let realName = fieldName;
          if (realName.indexOf(':') === 0) realName = realName.substr(1);
          label = this.getLanguage().translate(realName, 'fields', this.scope);
          if (realName !== fieldName) {
            label = label + ' *';
          }
          const o = {
            name: fieldName,
            labelText: label
          };
          const fieldType = this.getMetadata().get(['entityDefs', this.scope, 'fields', fieldName, 'type']);
          if (fieldType) {
            if (this.getMetadata().get(['fields', fieldType, 'notSortable'])) {
              o.notSortable = true;
            }
          }
          this.disabledFields.push(o);
        }
      }
      this.enabledFields.forEach(item => {
        if (~duplicateLabelList.indexOf(item.label)) {
          item.labelText += ' (' + item.name + ')';
        }
      });
      this.disabledFields.forEach(item => {
        if (~duplicateLabelList.indexOf(item.label)) {
          item.labelText += ' (' + item.name + ')';
        }
      });
      this.rowLayout = layout;
      for (const i in this.rowLayout) {
        let label = this.getLanguage().translate(this.rowLayout[i].name, 'fields', this.scope);
        this.enabledFields.forEach(item => {
          if (item.name === this.rowLayout[i].name) {
            label = item.labelText;
          }
        });
        this.rowLayout[i].labelText = label;
        this.itemsData[this.rowLayout[i].name] = Espo.Utils.cloneDeep(this.rowLayout[i]);
      }
    }

    // noinspection JSUnusedLocalSymbols
    checkFieldType(type) {
      return true;
    }
    isFieldEnabled(model, name) {
      if (~['modifiedAt', 'createdAt', 'modifiedBy', 'createdBy'].indexOf(name)) {
        return false;
      }
      const layoutList = model.getFieldParam(name, 'layoutAvailabilityList');
      if (layoutList && !layoutList.includes(this.type)) {
        return false;
      }
      const layoutIgnoreList = model.getFieldParam(name, 'layoutIgnoreList') || [];
      if (layoutIgnoreList.includes(this.type)) {
        return false;
      }
      if (model.getFieldParam(name, 'disabled') || model.getFieldParam(name, 'utility')) {
        return false;
      }
      if (model.getFieldParam(name, 'layoutDefaultSidePanelDisabled')) {
        return false;
      }
      if (model.getFieldParam(name, 'layoutDetailDisabled')) {
        return false;
      }
      return true;
    }
  }
  var _default = _exports.default = LayoutDefaultSidePanel;
});

define("views/admin/layouts/bottom-panels-edit-small", ["exports", "views/admin/layouts/bottom-panels-edit"], function (_exports, _bottomPanelsEdit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _bottomPanelsEdit = _interopRequireDefault(_bottomPanelsEdit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _bottomPanelsEdit.default {
    viewType = 'editSmall';
  }
  _exports.default = _default;
});

define("views/admin/layouts/bottom-panels-detail-small", ["exports", "views/admin/layouts/bottom-panels-detail"], function (_exports, _bottomPanelsDetail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _bottomPanelsDetail = _interopRequireDefault(_bottomPanelsDetail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class _default extends _bottomPanelsDetail.default {
    viewType = 'detailSmall';
  }
  _exports.default = _default;
});

define("views/admin/layouts/record/edit-attributes", ["exports", "views/record/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    template = 'admin/layouts/record/edit-attributes';

    /** @internal Important for dynamic logic working. */
    mode = 'edit';
    data() {
      return {
        attributeDataList: this.getAttributeDataList()
      };
    }
    getAttributeDataList() {
      const list = [];
      this.attributeList.forEach(attribute => {
        const defs = this.attributeDefs[attribute] || {};
        const type = defs.type;
        const isWide = !['enum', 'bool', 'int', 'float', 'varchar'].includes(type) && attribute !== 'widthComplex';
        list.push({
          name: attribute,
          viewKey: attribute + 'Field',
          isWide: isWide,
          label: this.translate(defs.label || attribute, 'fields', 'LayoutManager')
        });
      });
      return list;
    }
    setup() {
      super.setup();
      this.attributeList = this.options.attributeList || [];
      this.attributeDefs = this.options.attributeDefs || {};
      this.attributeList.forEach(field => {
        const params = this.attributeDefs[field] || {};
        const type = params.type || 'base';
        const viewName = params.view || this.getFieldManager().getViewName(type);
        this.createField(field, viewName, params);
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/layouts/modals/panel-attributes", ["exports", "views/modal", "model"], function (_exports, _modal, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutPanelAttributesView extends _modal.default {
    templateContent = `
        <div class="panel panel-default no-side-margin">
            <div class="panel-body">
                <div class="edit-container">{{{edit}}}</div>
            </div>
        </div>
    `;
    className = 'dialog dialog-record';
    shortcutKeys = {
      /** @this LayoutPanelAttributesView */
      'Control+Enter': function (e) {
        if (document.activeElement instanceof HTMLInputElement) {
          document.activeElement.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
        this.actionSave();
        e.preventDefault();
        e.stopPropagation();
      }
    };
    setup() {
      this.buttonList = [{
        name: 'save',
        text: this.translate('Apply'),
        style: 'primary'
      }, {
        name: 'cancel',
        label: 'Cancel'
      }];
      const model = new _model.default();
      model.name = 'LayoutManager';
      model.set(this.options.attributes || {});
      const attributeList = this.options.attributeList;
      const attributeDefs = this.options.attributeDefs;
      this.createView('edit', 'views/admin/layouts/record/edit-attributes', {
        selector: '.edit-container',
        attributeList: attributeList,
        attributeDefs: attributeDefs,
        model: model,
        dynamicLogicDefs: this.options.dynamicLogicDefs
      });
    }
    actionSave() {
      const editView = /** @type {import('views/record/edit').default} */
      this.getView('edit');
      const attrs = editView.fetch();
      editView.model.set(attrs, {
        silent: true
      });
      if (editView.validate()) {
        return;
      }
      const attributes = editView.model.attributes;
      this.trigger('after:save', attributes);
      return true;
    }
  }
  _exports.default = LayoutPanelAttributesView;
});

define("views/admin/layouts/modals/edit-attributes", ["exports", "views/modal", "model"], function (_exports, _modal, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutEditAttributesView extends _modal.default {
    templateContent = `
        <div class="panel panel-default no-side-margin">
            <div class="panel-body">
                <div class="edit-container">{{{edit}}}</div>
            </div>
        </div>
    `;
    className = 'dialog dialog-record';
    shortcutKeys = {
      /** @this LayoutEditAttributesView */
      'Control+Enter': function (e) {
        this.actionSave();
        e.preventDefault();
        e.stopPropagation();
      }
    };
    setup() {
      this.buttonList = [{
        name: 'save',
        text: this.translate('Apply'),
        style: 'primary'
      }, {
        name: 'cancel',
        text: this.translate('Cancel')
      }];
      const model = new _model.default();
      model.name = 'LayoutManager';
      model.set(this.options.attributes || {});
      this.headerText = undefined;
      if (this.options.languageCategory) {
        this.headerText = this.translate(this.options.name, this.options.languageCategory, this.options.scope);
      }
      let attributeList = Espo.Utils.clone(this.options.attributeList || []);
      const filteredAttributeList = [];
      attributeList.forEach(item => {
        const defs = this.options.attributeDefs[item] || {};
        if (defs.readOnly || defs.hidden) {
          return;
        }
        filteredAttributeList.push(item);
      });
      attributeList = filteredAttributeList;
      this.createView('edit', 'views/admin/layouts/record/edit-attributes', {
        selector: '.edit-container',
        attributeList: attributeList,
        attributeDefs: this.options.attributeDefs,
        dynamicLogicDefs: this.options.dynamicLogicDefs,
        model: model
      });
    }
    actionSave() {
      const editView = /** @type {import('views/record/edit').default} */this.getView('edit');
      const attrs = editView.fetch();
      editView.model.set(attrs, {
        silent: true
      });
      if (editView.validate()) {
        return;
      }
      const attributes = editView.model.attributes;
      this.trigger('after:save', attributes);
      return true;
    }
  }
  _exports.default = LayoutEditAttributesView;
});

define("views/admin/layouts/fields/width-complex", ["exports", "views/fields/base", "views/fields/enum", "model", "views/fields/float"], function (_exports, _base, _enum, _model, _float) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  _enum = _interopRequireDefault(_enum);
  _model = _interopRequireDefault(_model);
  _float = _interopRequireDefault(_float);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LayoutWidthComplexFieldView extends _base.default {
    editTemplateContent = `
        <div class="row">
            <div data-name="value" class="col-sm-6">{{{value}}}</div>
            <div data-name="unit" class="col-sm-6">{{{unit}}}</div>
        </div>

    `;
    getAttributeList() {
      return ['width', 'widthPx'];
    }
    setup() {
      this.auxModel = new _model.default();
      this.syncAuxModel();
      this.listenTo(this.model, 'change', (m, /** Record */o) => {
        if (o.ui) {
          return;
        }
        this.syncAuxModel();
      });
      const unitView = new _enum.default({
        name: 'unit',
        mode: 'edit',
        model: this.auxModel,
        params: {
          options: ['%', 'px']
        }
      });
      const valueView = this.valueView = new _float.default({
        name: 'value',
        mode: 'edit',
        model: this.auxModel,
        params: {
          min: this.getMinValue(),
          max: this.getMaxValue()
        },
        labelText: this.translate('Value')
      });
      this.assignView('unit', unitView, '[data-name="unit"]');
      this.assignView('value', valueView, '[data-name="value"]');
      this.listenTo(this.auxModel, 'change', (m, o) => {
        if (!o.ui) {
          return;
        }
        this.valueView.params.max = this.getMaxValue();
        this.valueView.params.min = this.getMinValue();
        this.model.set(this.fetch(), {
          ui: true
        });
      });
    }
    getMinValue() {
      return this.auxModel.attributes.unit === 'px' ? 30 : 5;
    }
    getMaxValue() {
      return this.auxModel.attributes.unit === 'px' ? 768 : 95;
    }
    validate() {
      return this.valueView.validate();
    }
    fetch() {
      if (this.auxModel.attributes.unit === 'px') {
        return {
          width: null,
          widthPx: this.auxModel.attributes.value
        };
      }
      return {
        width: this.auxModel.attributes.value,
        widthPx: null
      };
    }
    syncAuxModel() {
      const width = this.model.attributes.width;
      const widthPx = this.model.attributes.widthPx;
      const unit = width || !widthPx ? '%' : 'px';
      this.auxModel.set({
        unit: unit,
        value: unit === 'px' ? widthPx : width
      });
    }
  }

  // noinspection JSUnusedGlobalSymbols
  var _default = _exports.default = LayoutWidthComplexFieldView;
});

define("views/admin/label-manager/index", ["exports", "view", "ui/select"], function (_exports, _view, _select) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _select = _interopRequireDefault(_select);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LabelManagerView extends _view.default {
    template = 'admin/label-manager/index';
    scopeList = null;
    scope = null;
    language = null;
    languageList = null;
    events = {
      /** @this LabelManagerView */
      'click [data-action="selectScope"]': function (e) {
        const scope = $(e.currentTarget).data('name');
        this.getRouter().checkConfirmLeaveOut(() => {
          this.selectScope(scope);
        });
      },
      /** @this LabelManagerView */
      'change select[data-name="language"]': function (e) {
        const language = $(e.currentTarget).val();
        this.getRouter().checkConfirmLeaveOut(() => {
          this.selectLanguage(language);
        });
      }
    };
    data() {
      return {
        scopeList: this.scopeList,
        languageList: this.languageList,
        scope: this.scope,
        language: this.language
      };
    }
    setup() {
      this.languageList = this.getMetadata().get(['app', 'language', 'list']) || ['en_US'];
      this.languageList.sort((v1, v2) => {
        return this.getLanguage().translateOption(v1, 'language').localeCompare(this.getLanguage().translateOption(v2, 'language'));
      });
      this.wait(true);
      Espo.Ajax.postRequest('LabelManager/action/getScopeList').then(scopeList => {
        this.scopeList = scopeList;
        this.scopeList.sort((v1, v2) => {
          return this.translate(v1, 'scopeNamesPlural').localeCompare(this.translate(v2, 'scopeNamesPlural'));
        });
        this.scopeList = this.scopeList.filter(scope => {
          if (scope === 'Global') {
            return;
          }
          if (this.getMetadata().get(['scopes', scope])) {
            if (this.getMetadata().get(['scopes', scope, 'disabled'])) {
              return;
            }
          }
          return true;
        });
        this.scopeList.unshift('Global');
        this.wait(false);
      });
      this.scope = this.options.scope || 'Global';
      this.language = this.options.language || this.getConfig().get('language');
      this.once('after:render', () => {
        this.selectScope(this.scope, true);
      });
    }
    afterRender() {
      _select.default.init(this.element.querySelector(`select[data-name="language"]`));
    }
    selectLanguage(language) {
      this.language = language;
      if (this.scope) {
        this.getRouter().navigate('#Admin/labelManager/scope=' + this.scope + '&language=' + this.language, {
          trigger: false
        });
      } else {
        this.getRouter().navigate('#Admin/labelManager/language=' + this.language, {
          trigger: false
        });
      }
      this.createRecordView();
    }
    selectScope(scope, skipRouter) {
      this.scope = scope;
      if (!skipRouter) {
        this.getRouter().navigate('#Admin/labelManager/scope=' + scope + '&language=' + this.language, {
          trigger: false
        });
      }
      this.$el.find('[data-action="selectScope"]').removeClass('disabled').removeAttr('disabled');
      this.$el.find('[data-name="' + scope + '"][data-action="selectScope"]').addClass('disabled').attr('disabled', 'disabled');
      this.createRecordView();
    }
    createRecordView() {
      Espo.Ui.notify(' ... ');
      this.createView('record', 'views/admin/label-manager/edit', {
        selector: '.language-record',
        scope: this.scope,
        language: this.language
      }, view => {
        view.render();
        Espo.Ui.notify(false);
        $(window).scrollTop(0);
      });
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Label Manager', 'labels', 'Admin'));
    }
  }
  var _default = _exports.default = LabelManagerView;
});

define("views/admin/label-manager/edit", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LabelManagerEditView extends _view.default {
    template = 'admin/label-manager/edit';

    /**
     * @type {Object.<string, Object.<string, string>>}
     */
    scopeData;
    events = {
      /** @this LabelManagerEditView */
      'click [data-action="toggleCategory"]': function (e) {
        const name = $(e.currentTarget).data('name');
        this.toggleCategory(name);
      },
      /** @this LabelManagerEditView */
      'keyup input[data-name="quick-search"]': function (e) {
        this.processQuickSearch(e.currentTarget.value);
      },
      /** @this LabelManagerEditView */
      'click [data-action="showCategory"]': function (e) {
        const name = $(e.currentTarget).data('name');
        this.showCategory(name);
      },
      /** @this LabelManagerEditView */
      'click [data-action="hideCategory"]': function (e) {
        const name = $(e.currentTarget).data('name');
        this.hideCategory(name);
      },
      /** @this LabelManagerEditView */
      'click [data-action="cancel"]': function () {
        this.actionCancel();
      },
      /** @this LabelManagerEditView */
      'click [data-action="save"]': function () {
        this.actionSave();
      },
      /** @this LabelManagerEditView */
      'change input.label-value': function (e) {
        const name = $(e.currentTarget).data('name');
        const value = $(e.currentTarget).val();
        this.setLabelValue(name, value);
      }
    };
    data() {
      return {
        categoryList: this.getCategoryList(),
        scope: this.scope
      };
    }
    setup() {
      this.scope = this.options.scope;
      this.language = this.options.language;
      this.categoryShownMap = {};
      this.dirtyLabelList = [];
      this.wait(Espo.Ajax.postRequest('LabelManager/action/getScopeData', {
        scope: this.scope,
        language: this.language
      }).then(data => {
        this.scopeData = data;
        this.scopeDataInitial = Espo.Utils.cloneDeep(this.scopeData);
        Object.keys(this.scopeData).forEach(category => {
          this.createView(category, 'views/admin/label-manager/category', {
            selector: `.panel-body[data-name="${category}"]`,
            categoryData: this.getCategoryData(category),
            scope: this.scope,
            language: this.language
          });
        });
      }));
    }
    getCategoryList() {
      return Object.keys(this.scopeData).sort((v1, v2) => {
        return v1.localeCompare(v2);
      });
    }
    setLabelValue(name, value) {
      const category = name.split('[.]')[0];
      value = value.replace(/\\\\n/i, '\n');
      value = value.trim();
      this.scopeData[category][name] = value;
      this.dirtyLabelList.push(name);
      this.setConfirmLeaveOut(true);
      if (!this.getCategoryView(category)) {
        return;
      }
      this.getCategoryView(category).categoryData[name] = value;
    }

    /**
     * @param {string} category
     * @return {import('./category').default}
     */
    getCategoryView(category) {
      return this.getView(category);
    }
    setConfirmLeaveOut(value) {
      this.getRouter().confirmLeaveOut = value;
    }
    afterRender() {
      this.$save = this.$el.find('button[data-action="save"]');
      this.$cancel = this.$el.find('button[data-action="cancel"]');
      this.$panels = this.$el.find('.category-panel');
      this.$noData = this.$el.find('.no-data');
    }
    actionSave() {
      this.$save.addClass('disabled').attr('disabled');
      this.$cancel.addClass('disabled').attr('disabled');
      const data = {};
      this.dirtyLabelList.forEach(name => {
        const category = name.split('[.]')[0];
        data[name] = this.scopeData[category][name];
      });
      Espo.Ui.notify(this.translate('saving', 'messages'));
      Espo.Ajax.postRequest('LabelManager/action/saveLabels', {
        scope: this.scope,
        language: this.language,
        labels: data
      }).then(returnData => {
        this.scopeDataInitial = Espo.Utils.cloneDeep(this.scopeData);
        this.dirtyLabelList = [];
        this.setConfirmLeaveOut(false);
        this.$save.removeClass('disabled').removeAttr('disabled');
        this.$cancel.removeClass('disabled').removeAttr('disabled');
        for (const key in returnData) {
          const name = key.split('[.]').splice(1).join('[.]');
          this.$el.find(`input.label-value[data-name="${name}"]`).val(returnData[key]);
        }
        Espo.Ui.success(this.translate('Saved'));
        this.getHelper().broadcastChannel.postMessage('update:language');
        this.getLanguage().loadSkipCache();
      }).catch(() => {
        this.$save.removeClass('disabled').removeAttr('disabled');
        this.$cancel.removeClass('disabled').removeAttr('disabled');
      });
    }
    actionCancel() {
      this.scopeData = Espo.Utils.cloneDeep(this.scopeDataInitial);
      this.dirtyLabelList = [];
      this.setConfirmLeaveOut(false);
      this.getCategoryList().forEach(category => {
        if (!this.getCategoryView(category)) {
          return;
        }
        this.getCategoryView(category).categoryData = this.scopeData[category];
        this.getCategoryView(category).reRender();
      });
    }
    toggleCategory(category) {
      !this.categoryShownMap[category] ? this.showCategory(category) : this.hideCategory(category);
    }
    showCategory(category) {
      this.$el.find(`a[data-action="showCategory"][data-name="${category}"]`).addClass('hidden');
      this.$el.find(`a[data-action="hideCategory"][data-name="${category}"]`).removeClass('hidden');
      this.$el.find(`.panel-body[data-name="${category}"]`).removeClass('hidden');
      this.categoryShownMap[category] = true;
    }
    hideCategory(category) {
      this.$el.find(`.panel-body[data-name="${category}"]`).addClass('hidden');
      this.$el.find(`a[data-action="showCategory"][data-name="${category}"]`).removeClass('hidden');
      this.$el.find(`a[data-action="hideCategory"][data-name="${category}"]`).addClass('hidden');
      this.categoryShownMap[category] = false;
    }
    getCategoryData(category) {
      return this.scopeData[category] || {};
    }
    processQuickSearch(text) {
      text = text.trim();
      if (!text) {
        this.$panels.removeClass('hidden');
        this.$panels.find('.row').removeClass('hidden');
        this.$noData.addClass('hidden');
        return;
      }
      const matchedCategoryList = [];
      /** @type {Object.<string, string[]>} */
      const matchedMapList = {};
      const lowerCaseText = text.toLowerCase();
      let anyMatched = false;
      Object.keys(this.scopeData).forEach(/** string */category => {
        matchedMapList[category] = [];
        Object.keys(this.scopeData[category]).forEach(/** string */item => {
          let matched = false;
          const value = /** @type {string} */this.scopeData[category][item];
          if (value.toLowerCase().indexOf(lowerCaseText) === 0 || item.toLowerCase().indexOf(lowerCaseText) === 0) {
            matched = true;
          }
          if (!matched) {
            const wordList = value.split(' ').concat(value.split(' '));
            for (const word of wordList) {
              if (word.toLowerCase().indexOf(lowerCaseText) === 0) {
                matched = true;
                break;
              }
            }
          }
          if (!matched) {
            return;
          }
          anyMatched = true;
          matchedMapList[category].push(item);
          if (!matchedCategoryList.includes(category)) {
            matchedCategoryList.push(category);
          }
        });
      });
      if (!anyMatched) {
        this.$panels.addClass('hidden');
        this.$panels.find('.row').addClass('hidden');
        this.$noData.removeClass('hidden');
        return;
      }
      this.$noData.addClass('hidden');
      Object.keys(this.scopeData).forEach(/** string */category => {
        const $categoryPanel = this.$panels.filter(`[data-name="${category}"]`);
        Object.keys(this.scopeData[category]).forEach(/** string */item => {
          const $row = $categoryPanel.find(`.row[data-name="${item}"]`);
          matchedMapList[category].includes(item) ? $row.removeClass('hidden') : $row.addClass('hidden');
        });
        matchedCategoryList.includes(category) ? $categoryPanel.removeClass('hidden') : $categoryPanel.addClass('hidden');
      });
    }
  }
  var _default = _exports.default = LabelManagerEditView;
});

define("views/admin/label-manager/category", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class LabelManagerCategoryView extends _view.default {
    template = 'admin/label-manager/category';
    events = {};
    data() {
      return {
        categoryDataList: this.getCategoryDataList()
      };
    }
    setup() {
      this.scope = this.options.scope;
      this.language = this.options.language;
      this.categoryData = this.options.categoryData;
    }
    getCategoryDataList() {
      const labelList = Object.keys(this.categoryData);
      labelList.sort((v1, v2) => {
        return v1.localeCompare(v2);
      });
      const categoryDataList = [];
      labelList.forEach(name => {
        let value = this.categoryData[name];
        if (value === null) {
          value = '';
        }
        if (value.replace) {
          value = value.replace(/\n/i, '\\n');
        }
        const o = {
          name: name,
          value: value
        };
        const arr = name.split('[.]');
        o.label = arr.slice(1).join(' . ');
        categoryDataList.push(o);
      });
      return categoryDataList;
    }
  }
  var _default = _exports.default = LabelManagerCategoryView;
});

define("views/admin/job/list", ["exports", "views/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    createButton = false;
    setup() {
      super.setup();
      if (!this.getHelper().getAppParam('isRestrictedMode') || this.getUser().isSuperAdmin()) {
        this.addMenuItem('buttons', {
          link: '#Admin/jobsSettings',
          text: this.translate('Settings', 'labels', 'Admin')
        });
      }
    }
    getHeader() {
      return this.buildHeaderHtml([$('<a>').attr('href', '#Admin').text(this.translate('Administration')), $('<span>').text(this.getLanguage().translate('Jobs', 'labels', 'Admin'))]);
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Jobs', 'labels', 'Admin'));
    }
  }
  _exports.default = _default;
});

define("views/admin/job/record/list", ["exports", "views/record/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    rowActionsView = 'views/record/row-actions/view-and-remove';
    massActionList = ['remove'];
    forceSettings = true;
  }
  _exports.default = _default;
});

define("views/admin/job/record/detail-small", ["exports", "views/record/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    sideView = null;
    isWide = true;
  }
  _exports.default = _default;
});

define("views/admin/job/modals/detail", ["exports", "views/modals/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    editDisabled = true;
    fullFormDisabled = true;
  }
  _exports.default = _default;
});

define("views/admin/job/fields/name", ["exports", "views/fields/varchar"], function (_exports, _varchar) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _varchar = _interopRequireDefault(_varchar);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _varchar.default {
    getValueForDisplay() {
      if (this.mode === 'list' || this.mode === 'detail' || this.mode === 'listLink') {
        if (!this.model.get('name')) {
          return this.model.get('serviceName') + ': ' + this.model.get('methodName');
        } else {
          return this.model.get('name');
        }
      }
    }
  }
  _exports.default = _default;
});

define("views/admin/integrations/oauth2", ["exports", "views/admin/integrations/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  // noinspection JSUnusedGlobalSymbols
  class IntegrationsOauth2EditView extends _edit.default {
    template = 'admin/integrations/oauth2';
    data() {
      const redirectUri = this.redirectUri || this.getConfig().get('siteUrl') + '?entryPoint=oauthCallback';
      return {
        ...super.data(),
        redirectUri: redirectUri
      };
    }
  }
  _exports.default = IntegrationsOauth2EditView;
});

define("views/admin/integrations/index", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class IntegrationsIndexView extends _view.default {
    template = 'admin/integrations/index';

    /**
     * @private
     * @type {string[]}
     */
    integrationList;
    integration = null;
    data() {
      return {
        integrationDataList: this.getIntegrationDataList(),
        integration: this.integration
      };
    }
    setup() {
      this.addHandler('click', 'a.integration-link', (e, target) => {
        this.openIntegration(target.dataset.name);
      });
      this.integrationList = Object.keys(this.getMetadata().get('integrations') || {}).sort((v1, v2) => this.translate(v1, 'titles', 'Integration').localeCompare(this.translate(v2, 'titles', 'Integration')));
      this.integration = this.options.integration || null;
      if (this.integration) {
        this.createIntegrationView(this.integration);
      }
      this.on('after:render', () => {
        this.renderHeader();
        if (!this.integration) {
          this.renderDefaultPage();
        }
      });
    }

    /**
     * @return {{name: string, active: boolean}[]}
     */
    getIntegrationDataList() {
      return this.integrationList.map(it => {
        return {
          name: it,
          active: this.integration === it
        };
      });
    }

    /**
     * @param {string} integration
     * @return {Promise<Bull.View>}
     */
    createIntegrationView(integration) {
      const viewName = this.getMetadata().get(`integrations.${integration}.view`) || 'views/admin/integrations/' + Espo.Utils.camelCaseToHyphen(this.getMetadata().get(`integrations.${integration}.authMethod`));
      return this.createView('content', viewName, {
        fullSelector: '#integration-content',
        integration: integration
      });
    }

    /**
     * @param {string} integration
     */
    async openIntegration(integration) {
      this.integration = integration;
      this.getRouter().navigate(`#Admin/integrations/name=${integration}`, {
        trigger: false
      });
      Espo.Ui.notify(' ... ');
      await this.createIntegrationView(integration);
      this.renderHeader();
      await this.reRender();
      Espo.Ui.notify(false);
      $(window).scrollTop(0);
    }
    afterRender() {
      this.$header = $('#integration-header');
    }
    renderDefaultPage() {
      this.$header.html('').hide();
      let msg;
      if (this.integrationList.length) {
        msg = this.translate('selectIntegration', 'messages', 'Integration');
      } else {
        msg = '<p class="lead">' + this.translate('noIntegrations', 'messages', 'Integration') + '</p>';
      }
      $('#integration-content').html(msg);
    }
    renderHeader() {
      if (!this.integration) {
        this.$header.html('');
        return;
      }
      this.$header.show().html(this.translate(this.integration, 'titles', 'Integration'));
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Integrations', 'labels', 'Admin'));
    }
  }
  _exports.default = IntegrationsIndexView;
});

define("views/admin/integrations/google-maps", ["exports", "views/admin/integrations/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {}
  _exports.default = _default;
});

define("views/admin/formula-sandbox/index", ["exports", "model", "view"], function (_exports, _model, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _model = _interopRequireDefault(_model);
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _view.default {
    template = 'admin/formula-sandbox/index';
    targetEntityType = null;
    storageKey = 'formulaSandbox';
    setup() {
      const entityTypeList = [''].concat(this.getMetadata().getScopeEntityList().filter(item => {
        return this.getMetadata().get(['scopes', item, 'object']);
      }));
      const data = {
        script: null,
        targetId: null,
        targetType: null,
        output: null
      };
      if (this.getSessionStorage().has(this.storageKey)) {
        const storedData = this.getSessionStorage().get(this.storageKey);
        data.script = storedData.script || null;
        data.targetId = storedData.targetId || null;
        data.targetName = storedData.targetName || null;
        data.targetType = storedData.targetType || null;
      }
      const model = this.model = new _model.default();
      model.name = 'Formula';
      model.setDefs({
        fields: {
          targetType: {
            type: 'enum',
            options: entityTypeList,
            translation: 'Global.scopeNames',
            view: 'views/fields/entity-type'
          },
          target: {
            type: 'link',
            entity: data.targetType
          },
          script: {
            type: 'formula',
            view: 'views/fields/formula'
          },
          output: {
            type: 'text',
            readOnly: true,
            displayRawText: true,
            tooltip: true
          },
          errorMessage: {
            type: 'text',
            readOnly: true,
            displayRawText: true
          }
        }
      });
      model.set(data);
      this.createRecordView();
      this.listenTo(this.model, 'change:targetType', (m, v, o) => {
        if (!o.ui) {
          return;
        }
        setTimeout(() => {
          this.targetEntityType = this.model.get('targetType');
          this.model.set({
            targetId: null,
            targetName: null
          }, {
            silent: true
          });
          const attributes = Espo.Utils.cloneDeep(this.model.attributes);
          this.clearView('record');
          this.model.set(attributes, {
            silent: true
          });
          this.model.defs.fields.target.entity = this.targetEntityType;
          this.createRecordView().then(view => view.render());
        }, 10);
      });
      this.listenTo(this.model, 'run', () => this.run());
      this.listenTo(this.model, 'change', (m, o) => {
        if (!o.ui) {
          return;
        }
        let dataToStore = {
          script: this.model.get('script'),
          targetType: this.model.get('targetType'),
          targetId: this.model.get('targetId'),
          targetName: this.model.get('targetName')
        };
        this.getSessionStorage().set(this.storageKey, dataToStore);
      });
    }
    createRecordView() {
      return this.createView('record', 'views/admin/formula-sandbox/record/edit', {
        selector: '.record',
        model: this.model,
        targetEntityType: this.targetEntityType,
        confirmLeaveDisabled: true,
        shortcutKeysEnabled: true
      });
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Formula Sandbox', 'labels', 'Admin'));
    }
    run() {
      const script = this.model.get('script');
      this.model.set({
        output: null,
        errorMessage: null
      });
      if (script === '' || script === null) {
        this.model.set('output', null);
        Espo.Ui.warning(this.translate('emptyScript', 'messages', 'Formula'));
        return;
      }
      Espo.Ajax.postRequest('Formula/action/run', {
        expression: script,
        targetId: this.model.get('targetId'),
        targetType: this.model.get('targetType')
      }).then(response => {
        this.model.set('output', response.output || null);
        let errorMessage = null;
        if (!response.isSuccess) {
          errorMessage = response.message || null;
        }
        this.model.set('errorMessage', errorMessage);
        if (response.isSuccess) {
          Espo.Ui.success(this.translate('runSuccess', 'messages', 'Formula'));
          return;
        }
        if (response.isSyntaxError) {
          let msg = this.translate('checkSyntaxError', 'messages', 'Formula');
          if (response.message) {
            msg += ' ' + response.message;
          }
          Espo.Ui.error(msg);
          return;
        }
        let msg = this.translate('runError', 'messages', 'Formula');
        if (response.message) {
          msg += ' ' + response.message;
        }
        Espo.Ui.error(msg);
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/formula-sandbox/record/edit", ["exports", "views/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _edit.default {
    scriptAreaHeight = 400;
    bottomView = null;
    sideView = null;
    dropdownItemList = [];
    isWide = true;
    accessControlDisabled = true;
    saveAndContinueEditingAction = false;
    saveAndNewAction = false;
    shortcutKeyCtrlEnterAction = 'run';
    setup() {
      this.scope = 'Formula';
      this.buttonList = [{
        name: 'run',
        label: 'Run',
        style: 'danger',
        title: 'Ctrl+Enter',
        onClick: () => this.actionRun()
      }];
      const additionalFunctionDataList = [{
        "name": "output\\print",
        "insertText": "output\\print(VALUE)"
      }, {
        "name": "output\\printLine",
        "insertText": "output\\printLine(VALUE)"
      }];
      this.detailLayout = [{
        rows: [[false, {
          name: 'targetType',
          labelText: this.translate('targetType', 'fields', 'Formula')
        }, {
          name: 'target',
          labelText: this.translate('target', 'fields', 'Formula')
        }]]
      }, {
        rows: [[{
          name: 'script',
          noLabel: true,
          options: {
            targetEntityType: this.model.get('targetType'),
            height: this.scriptAreaHeight,
            additionalFunctionDataList: additionalFunctionDataList
          }
        }]]
      }, {
        name: 'output',
        rows: [[{
          name: 'errorMessage',
          labelText: this.translate('error', 'fields', 'Formula')
        }], [{
          name: 'output',
          labelText: this.translate('output', 'fields', 'Formula')
        }]]
      }];
      super.setup();
      if (!this.model.get('targetType')) {
        this.hideField('target');
      } else {
        this.showField('target');
      }
      this.controlTargetTypeField();
      this.listenTo(this.model, 'change:targetId', () => this.controlTargetTypeField());
      this.controlOutputField();
      this.listenTo(this.model, 'change', () => this.controlOutputField());
    }
    controlTargetTypeField() {
      if (this.model.get('targetId')) {
        this.setFieldReadOnly('targetType');
        return;
      }
      this.setFieldNotReadOnly('targetType');
    }
    controlOutputField() {
      if (this.model.get('errorMessage')) {
        this.showField('errorMessage');
      } else {
        this.hideField('errorMessage');
      }
    }
    actionRun() {
      this.model.trigger('run');
    }
  }
  _exports.default = _default;
});

define("views/admin/formula/modals/add-function", ["exports", "views/modal"], function (_exports, _modal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _modal.default {
    template = 'admin/formula/modals/add-function';
    backdrop = true;
    data() {
      let text = this.translate('formulaFunctions', 'messages', 'Admin').replace('{documentationUrl}', this.documentationUrl);
      text = this.getHelper().transformMarkdownText(text, {
        linksInNewTab: true
      }).toString();
      return {
        functionDataList: this.functionDataList,
        text: text
      };
    }
    setup() {
      this.addActionHandler('add', (e, target) => {
        this.trigger('add', target.dataset.value);
      });
      this.headerText = this.translate('Function');
      this.documentationUrl = 'https://docs.espocrm.com/administration/formula/';
      this.functionDataList = this.options.functionDataList || this.getMetadata().get('app.formula.functionList') || [];
    }
  }
  _exports.default = _default;
});

define("views/admin/formula/modals/add-attribute", ["exports", "views/modal", "model"], function (_exports, _modal, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _modal.default {
    templateContent = '<div class="attribute" data-name="attribute">{{{attribute}}}</div>';
    backdrop = true;
    setup() {
      this.headerText = this.translate('Attribute');
      this.scope = this.options.scope;
      const model = new _model.default();
      this.createView('attribute', 'views/admin/formula/fields/attribute', {
        selector: '[data-name="attribute"]',
        model: model,
        mode: 'edit',
        scope: this.scope,
        defs: {
          name: 'attribute',
          params: {}
        },
        attributeList: this.options.attributeList
      }, view => {
        this.listenTo(view, 'change', () => {
          const list = model.get('attribute') || [];
          if (!list.length) {
            return;
          }
          this.trigger('add', list[0]);
        });
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/formula/fields/attribute", ["exports", "views/fields/multi-enum", "ui/multi-select"], function (_exports, _multiEnum, _multiSelect) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  _multiSelect = _interopRequireDefault(_multiSelect);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class FormulaAttributeFieldView extends _multiEnum.default {
    setupOptions() {
      super.setupOptions();
      if (this.options.attributeList) {
        this.params.options = this.options.attributeList;
        return;
      }
      const attributeList = this.getFieldManager().getEntityTypeAttributeList(this.options.scope).concat(['id']).sort();
      const links = this.getMetadata().get(['entityDefs', this.options.scope, 'links']) || {};
      const linkList = [];
      Object.keys(links).forEach(link => {
        const type = links[link].type;
        const scope = links[link].entity;
        if (!type) {
          return;
        }
        if (!scope) {
          return;
        }
        if (links[link].disabled || links[link].utility) {
          return;
        }
        if (~['belongsToParent', 'hasOne', 'belongsTo'].indexOf(type)) {
          linkList.push(link);
        }
      });
      linkList.sort();
      linkList.forEach(link => {
        const scope = links[link].entity;
        const linkAttributeList = this.getFieldManager().getEntityTypeAttributeList(scope).sort();
        linkAttributeList.forEach(item => {
          attributeList.push(link + '.' + item);
        });
      });
      this.params.options = attributeList;
    }
    afterRender() {
      super.afterRender();
      if (this.$element) {
        _multiSelect.default.focus(this.$element);
      }
    }
  }
  _exports.default = FormulaAttributeFieldView;
});

define("views/admin/field-manager/list", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class FieldManagerListView extends _view.default {
    template = 'admin/field-manager/list';
    data() {
      return {
        scope: this.scope,
        fieldDefsArray: this.fieldDefsArray,
        typeList: this.typeList,
        hasAddField: this.hasAddField
      };
    }
    events = {
      /** @this FieldManagerListView */
      'click [data-action="removeField"]': function (e) {
        const field = $(e.currentTarget).data('name');
        this.removeField(field);
      },
      /** @this FieldManagerListView */
      'keyup input[data-name="quick-search"]': function (e) {
        this.processQuickSearch(e.currentTarget.value);
      }
    };
    setup() {
      this.scope = this.options.scope;
      this.isCustomizable = !!this.getMetadata().get(`scopes.${this.scope}.customizable`) && this.getMetadata().get(`scopes.${this.scope}.entityManager.fields`) !== false;
      this.hasAddField = true;
      const entityManagerData = this.getMetadata().get(['scopes', this.scope, 'entityManager']) || {};
      if ('addField' in entityManagerData) {
        this.hasAddField = entityManagerData.addField;
      }
      this.wait(this.buildFieldDefs());
    }
    afterRender() {
      this.$noData = this.$el.find('.no-data');
      this.$el.find('input[data-name="quick-search"]').focus();
    }
    buildFieldDefs() {
      return this.getModelFactory().create(this.scope).then(model => {
        this.fields = model.defs.fields;
        this.fieldList = Object.keys(this.fields).sort();
        this.fieldDefsArray = [];
        this.fieldList.forEach(field => {
          const defs = /** @type {Record} */this.fields[field];
          this.fieldDefsArray.push({
            name: field,
            isCustom: defs.isCustom || false,
            type: defs.type,
            label: this.translate(field, 'fields', this.scope),
            isEditable: !defs.customizationDisabled && this.isCustomizable
          });
        });
      });
    }
    removeField(field) {
      const msg = this.translate('confirmRemove', 'messages', 'FieldManager').replace('{field}', field);
      this.confirm(msg, () => {
        Espo.Ui.notify(' ... ');
        Espo.Ajax.deleteRequest('Admin/fieldManager/' + this.scope + '/' + field).then(() => {
          Espo.Ui.success(this.translate('Removed'));
          this.$el.find(`tr[data-name="${field}"]`).remove();
          this.getMetadata().loadSkipCache().then(() => {
            this.buildFieldDefs().then(() => {
              this.broadcastUpdate();
              return this.reRender();
            }).then(() => Espo.Ui.success(this.translate('Removed')));
          });
        });
      });
    }
    broadcastUpdate() {
      this.getHelper().broadcastChannel.postMessage('update:metadata');
      this.getHelper().broadcastChannel.postMessage('update:language');
    }
    processQuickSearch(text) {
      text = text.trim();
      const $noData = this.$noData;
      $noData.addClass('hidden');
      if (!text) {
        this.$el.find('table tr.field-row').removeClass('hidden');
        return;
      }
      const matchedList = [];
      const lowerCaseText = text.toLowerCase();
      this.fieldDefsArray.forEach(item => {
        let matched = false;
        if (item.label.toLowerCase().indexOf(lowerCaseText) === 0 || item.name.toLowerCase().indexOf(lowerCaseText) === 0) {
          matched = true;
        }
        if (!matched) {
          const wordList = item.label.split(' ').concat(item.label.split(' '));
          wordList.forEach(word => {
            if (word.toLowerCase().indexOf(lowerCaseText) === 0) {
              matched = true;
            }
          });
        }
        if (matched) {
          matchedList.push(item.name);
        }
      });
      if (matchedList.length === 0) {
        this.$el.find('table tr.field-row').addClass('hidden');
        $noData.removeClass('hidden');
        return;
      }
      this.fieldDefsArray.map(item => item.name).forEach(field => {
        const $row = this.$el.find(`table tr.field-row[data-name="${field}"]`);
        if (!~matchedList.indexOf(field)) {
          $row.addClass('hidden');
          return;
        }
        $row.removeClass('hidden');
      });
    }
  }
  var _default = _exports.default = FieldManagerListView;
});

define("views/admin/field-manager/index", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class IndexFieldManagerView extends _view.default {
    template = 'admin/field-manager/index';
    scopeList = null;
    scope = null;
    type = null;
    data() {
      return {
        scopeList: this.scopeList,
        scope: this.scope
      };
    }
    events = {
      /** @this IndexFieldManagerView */
      'click #scopes-menu a.scope-link': function (e) {
        const scope = $(e.currentTarget).data('scope');
        this.openScope(scope);
      },
      /** @this IndexFieldManagerView */
      'click #fields-content a.field-link': function (e) {
        e.preventDefault();
        const scope = $(e.currentTarget).data('scope');
        const field = $(e.currentTarget).data('field');
        this.openField(scope, field);
      },
      /** @this IndexFieldManagerView */
      'click [data-action="addField"]': function () {
        this.createView('dialog', 'views/admin/field-manager/modals/add-field', {}, view => {
          view.render();
          this.listenToOnce(view, 'add-field', type => {
            this.createField(this.scope, type);
          });
        });
      }
    };
    setup() {
      this.scopeList = [];
      const scopesAll = Object.keys(this.getMetadata().get('scopes')).sort((v1, v2) => {
        return this.translate(v1, 'scopeNamesPlural').localeCompare(this.translate(v2, 'scopeNamesPlural'));
      });
      scopesAll.forEach(scope => {
        if (this.getMetadata().get('scopes.' + scope + '.entity') && this.getMetadata().get('scopes.' + scope + '.customizable')) {
          this.scopeList.push(scope);
        }
      });
      this.scope = this.options.scope || null;
      this.field = this.options.field || null;
      this.on('after:render', () => {
        if (!this.scope) {
          this.renderDefaultPage();
          return;
        }
        if (!this.field) {
          this.openScope(this.scope);
        } else {
          this.openField(this.scope, this.field);
        }
      });
      this.createView('header', 'views/admin/field-manager/header', {
        selector: '> .page-header',
        scope: this.scope,
        field: this.field
      });
    }
    openScope(scope) {
      this.scope = scope;
      this.field = null;
      this.getHeaderView().setField(null);
      this.getRouter().navigate('#Admin/fieldManager/scope=' + scope, {
        trigger: false
      });
      Espo.Ui.notify(' ... ');
      this.createView('content', 'views/admin/field-manager/list', {
        fullSelector: '#fields-content',
        scope: scope
      }, view => {
        view.render();
        Espo.Ui.notify(false);
        $(window).scrollTop(0);
      });
    }

    /**
     *
     * @return {import('./header').default}
     */
    getHeaderView() {
      return this.getView('header');
    }
    openField(scope, field) {
      this.scope = scope;
      this.field = field;
      this.getHeaderView().setField(field);
      this.getRouter().navigate('#Admin/fieldManager/scope=' + scope + '&field=' + field, {
        trigger: false
      });
      Espo.Ui.notify(' ... ');
      this.createView('content', 'views/admin/field-manager/edit', {
        fullSelector: '#fields-content',
        scope: scope,
        field: field
      }, view => {
        view.render();
        Espo.Ui.notify(false);
        $(window).scrollTop(0);
        this.listenTo(view, 'after:save', () => {
          Espo.Ui.success(this.translate('Saved'));
        });
      });
    }

    /**
     * @private
     * @param {string} scope
     * @param {string} type
     */
    createField(scope, type) {
      this.scope = scope;
      this.type = type;
      this.getRouter().navigate('#Admin/fieldManager/scope=' + scope + '&type=' + type + '&create=true', {
        trigger: false
      });
      Espo.Ui.notify(' ... ');
      this.createView('content', 'views/admin/field-manager/edit', {
        fullSelector: '#fields-content',
        scope: scope,
        type: type
      }, view => {
        view.render();
        Espo.Ui.notify(false);
        $(window).scrollTop(0);
        view.once('after:save', () => {
          this.openScope(this.scope);
          if (!this.getMetadata().get(`scopes.${this.scope}.layouts`)) {
            Espo.Ui.success(this.translate('Created'), {
              suppress: true
            });
            return;
          }
          const message = this.translate('fieldCreatedAddToLayouts', 'messages', 'FieldManager').replace('{link}', `#Admin/layouts/scope=${this.scope}&em=true`);
          setTimeout(() => {
            Espo.Ui.notify(message, 'success', undefined, {
              closeButton: true
            });
          }, 100);
        });
      });
    }
    renderDefaultPage() {
      $('#fields-content').html(this.translate('selectEntityType', 'messages', 'Admin'));
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Field Manager', 'labels', 'Admin'));
    }
  }
  var _default = _exports.default = IndexFieldManagerView;
});

define("views/admin/field-manager/header", ["exports", "view"], function (_exports, _view) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class FieldManagerHeaderView extends _view.default {
    template = 'admin/field-manager/header';
    data() {
      return {
        scope: this.scope,
        field: this.field
      };
    }
    setup() {
      this.scope = this.options.scope;
      this.field = this.options.field;
    }
    setField(field) {
      this.field = field;
      if (this.isRendered()) {
        this.reRender();
      }
    }
  }
  var _default = _exports.default = FieldManagerHeaderView;
});

define("views/admin/field-manager/edit", ["exports", "view", "model"], function (_exports, _view, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class FieldManagerEditView extends _view.default {
    template = 'admin/field-manager/edit';
    paramWithTooltipList = ['audited', 'required', 'default', 'min', 'max', 'maxLength', 'after', 'before', 'readOnly', 'readOnlyAfterCreate'];

    /**
     * @type {{
     *     forbidden?: boolean,
     *     internal?: boolean,
     *     onlyAdmin?: boolean,
     *     readOnly?: boolean,
     *     nonAdminReadOnly?: boolean,
     * }|{}}
     */
    globalRestriction = null;
    hasAnyGlobalRestriction = false;

    /**
     * @readonly
     */
    globalRestrictionTypeList = ['forbidden', 'internal', 'onlyAdmin', 'readOnly', 'nonAdminReadOnly'];

    /** @type {Model & {fetchedAttributes?: Record}}*/
    model;
    /** @type {Record[]} */
    paramList;
    data() {
      return {
        scope: this.scope,
        field: this.field,
        defs: this.defs,
        paramList: this.paramList,
        type: this.type,
        fieldList: this.fieldList,
        isCustom: this.defs.isCustom,
        isNew: this.isNew,
        hasDynamicLogicPanel: this.hasDynamicLogicPanel,
        hasResetToDefault: !this.defs.isCustom && !this.entityTypeIsCustom && !this.isNew
      };
    }
    events = {
      /** @this FieldManagerEditView */
      'click button[data-action="close"]': function () {
        this.actionClose();
      },
      /** @this FieldManagerEditView */
      'click button[data-action="save"]': function () {
        this.save();
      },
      /** @this FieldManagerEditView */
      'click button[data-action="resetToDefault"]': function () {
        this.resetToDefault();
      },
      /** @this FieldManagerEditView */
      'keydown.form': function (e) {
        const key = Espo.Utils.getKeyFromKeyEvent(e);
        if (key === 'Control+KeyS' || key === 'Control+Enter') {
          this.save();
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    setupFieldData(callback) {
      this.defs = {};
      this.fieldList = [];
      this.model = new _model.default();
      this.model.name = 'Admin';
      this.model.urlRoot = 'Admin/fieldManager/' + this.scope;
      this.model.defs = {
        fields: {
          name: {
            required: true,
            maxLength: 50
          },
          label: {
            required: true
          },
          tooltipText: {}
        }
      };
      this.entityTypeIsCustom = !!this.getMetadata().get(['scopes', this.scope, 'isCustom']);
      this.globalRestriction = {};
      if (!this.isNew) {
        this.model.id = this.field;
        this.model.scope = this.scope;
        this.model.set('name', this.field);
        this.model.set('label', this.getLanguage().translate(this.field, 'fields', this.scope));
        if (this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'tooltip'])) {
          this.model.set('tooltipText', this.getLanguage().translate(this.field, 'tooltips', this.scope));
        }
        this.globalRestriction = this.getMetadata().get(['entityAcl', this.scope, 'fields', this.field]) || {};
        const globalRestrictions = this.globalRestrictionTypeList.filter(item => this.globalRestriction[item]);
        if (globalRestrictions.length) {
          this.model.set('globalRestrictions', globalRestrictions);
          this.hasAnyGlobalRestriction = true;
        }
      } else {
        this.model.scope = this.scope;
        this.model.set('type', this.type);
      }
      this.listenTo(this.model, 'change:readOnly', () => {
        this.readOnlyControl();
      });
      let hasRequired = false;
      this.getModelFactory().create(this.scope, model => {
        if (!this.isNew) {
          this.type = model.getFieldType(this.field);
        }
        if (this.getMetadata().get(['scopes', this.scope, 'hasPersonalData']) && this.getMetadata().get(['fields', this.type, 'personalData'])) {
          this.hasPersonalData = true;
        }
        this.hasInlineEditDisabled = !['foreign', 'autoincrement'].includes(this.type) && !this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'customizationInlineEditDisabledDisabled']);
        this.hasTooltipText = !this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'customizationTooltipTextDisabled']);
        new Promise(resolve => {
          if (this.isNew) {
            resolve();
            return;
          }
          Espo.Ajax.getRequest('Admin/fieldManager/' + this.scope + '/' + this.field).then(data => {
            this.defs = data;
            resolve();
          });
        }).then(() => {
          const promiseList = [];
          this.paramList = [];
          const paramList = Espo.Utils.clone(this.getFieldManager().getParamList(this.type) || []);
          if (!this.isNew) {
            const fieldManagerAdditionalParamList = this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'fieldManagerAdditionalParamList']) || [];
            fieldManagerAdditionalParamList.forEach(item => {
              paramList.push(item);
            });
          }

          /** @var {string[]|null} */
          const fieldManagerParamList = this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'fieldManagerParamList']);
          paramList.forEach(o => {
            const item = o.name;
            if (fieldManagerParamList && fieldManagerParamList.indexOf(item) === -1) {
              return;
            }
            if (item === 'readOnly' && this.globalRestriction && this.globalRestriction.readOnly) {
              return;
            }
            if (item === 'required') {
              hasRequired = true;
            }
            if (item === 'createButton' && ['assignedUser', 'assignedUsers', 'teams', 'collaborators'].includes(this.field)) {
              return;
            }
            if (item === 'autocompleteOnEmpty' && ['assignedUser'].includes(this.field)) {
              return;
            }
            const disableParamName = 'customization' + Espo.Utils.upperCaseFirst(item) + 'Disabled';
            const isDisabled = this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, disableParamName]);
            if (isDisabled) {
              return;
            }
            const viewParamName = 'customization' + Espo.Utils.upperCaseFirst(item) + 'View';
            const view = this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, viewParamName]);
            if (view) {
              o.view = view;
            }
            this.paramList.push(o);
          });
          if (this.hasPersonalData) {
            this.paramList.push({
              name: 'isPersonalData',
              type: 'bool'
            });
          }
          if (this.hasInlineEditDisabled && !this.globalRestriction.readOnly) {
            this.paramList.push({
              name: 'inlineEditDisabled',
              type: 'bool'
            });
          }
          if (this.hasTooltipText) {
            this.paramList.push({
              name: 'tooltipText',
              type: 'text',
              rowsMin: 1,
              trim: true
            });
          }
          if (fieldManagerParamList) {
            this.paramList = this.paramList.filter(item => fieldManagerParamList.indexOf(item.name) !== -1);
          }
          this.paramList = this.paramList.filter(item => {
            return !(this.globalRestriction.readOnly && item.name === 'required');
          });
          const customizationDisabled = this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'customizationDisabled']);
          if (customizationDisabled || this.globalRestriction.forbidden) {
            this.paramList = [];
          }
          if (this.hasAnyGlobalRestriction) {
            this.paramList.push({
              name: 'globalRestrictions',
              type: 'array',
              readOnly: true,
              displayAsList: true,
              translation: 'FieldManager.options.globalRestrictions',
              options: this.globalRestrictionTypeList
            });
          }
          this.paramList.forEach(o => {
            this.model.defs.fields[o.name] = o;
          });
          this.model.set(this.defs);
          if (this.isNew) {
            this.model.populateDefaults();
          }
          promiseList.push(this.createFieldView('varchar', 'name', !this.isNew, {
            trim: true
          }));
          promiseList.push(this.createFieldView('varchar', 'label', null, {
            trim: true
          }));
          this.hasDynamicLogicPanel = false;
          promiseList.push(this.setupDynamicLogicFields(hasRequired));
          this.model.fetchedAttributes = this.model.getClonedAttributes();
          this.paramList.forEach(o => {
            if (o.hidden) {
              return;
            }
            const options = {};
            if (o.tooltip || ~this.paramWithTooltipList.indexOf(o.name)) {
              options.tooltip = true;
              let tooltip = o.name;
              if (typeof o.tooltip === 'string') {
                tooltip = o.tooltip;
              }
              options.tooltipText = this.translate(tooltip, 'tooltips', 'FieldManager');
            }
            if (o.readOnlyNotNew && !this.isNew) {
              options.readOnly = true;
            }
            promiseList.push(this.createFieldView(o.type, o.name, null, o, options));
          });
          Promise.all(promiseList).then(() => callback());
        });
      });
      this.listenTo(this.model, 'change', (m, o) => {
        if (!o.ui) {
          return;
        }
        this.setIsChanged();
      });
    }
    setup() {
      this.scope = this.options.scope;
      this.field = this.options.field;
      this.type = this.options.type;
      this.isNew = !this.field;
      if (!this.getMetadata().get(['scopes', this.scope, 'customizable']) || this.getMetadata().get(`scopes.${this.scope}.entityManager.fields`) === false || this.field && this.getMetadata().get(`entityDefs.${this.scope}.fields.${this.field}.customizationDisabled`)) {
        Espo.Ui.notify(false);
        throw new Espo.Exceptions.NotFound("Entity type is not customizable.");
      }
      this.wait(true);
      this.setupFieldData(() => {
        this.wait(false);
      });
    }
    setupDynamicLogicFields(hasRequired) {
      const defs = /** @type {Record}*/
      this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field]) || {};
      if (defs.disabled || defs.dynamicLogicDisabled || defs.layoutDetailDisabled || defs.utility) {
        return Promise.resolve();
      }
      const promiseList = [];
      if (!defs.dynamicLogicVisibleDisabled) {
        const isVisible = this.getMetadata().get(['clientDefs', this.scope, 'dynamicLogic', 'fields', this.field, 'visible']);
        this.model.set('dynamicLogicVisible', isVisible);
        promiseList.push(this.createFieldView(null, 'dynamicLogicVisible', null, {
          view: 'views/admin/field-manager/fields/dynamic-logic-conditions',
          scope: this.scope
        }));
        this.hasDynamicLogicPanel = true;
      }
      const readOnly = this.getMetadata().get(['fields', this.type, 'readOnly']);
      if (!defs.dynamicLogicRequiredDisabled && !readOnly && hasRequired) {
        const dynamicLogicRequired = this.getMetadata().get(['clientDefs', this.scope, 'dynamicLogic', 'fields', this.field, 'required']);
        this.model.set('dynamicLogicRequired', dynamicLogicRequired);
        promiseList.push(this.createFieldView(null, 'dynamicLogicRequired', null, {
          view: 'views/admin/field-manager/fields/dynamic-logic-conditions',
          scope: this.scope
        }));
        this.hasDynamicLogicPanel = true;
      }
      if (!defs.dynamicLogicReadOnlyDisabled && !readOnly) {
        const dynamicLogicReadOnly = this.getMetadata().get(['clientDefs', this.scope, 'dynamicLogic', 'fields', this.field, 'readOnly']);
        this.model.set('dynamicLogicReadOnly', dynamicLogicReadOnly);
        promiseList.push(this.createFieldView(null, 'dynamicLogicReadOnly', null, {
          view: 'views/admin/field-manager/fields/dynamic-logic-conditions',
          scope: this.scope
        }));
        this.hasDynamicLogicPanel = true;
      }
      const typeDynamicLogicOptions = this.getMetadata().get(['fields', this.type, 'dynamicLogicOptions']);
      if (typeDynamicLogicOptions && !defs.dynamicLogicOptionsDisabled) {
        const dynamicLogicOptions = this.getMetadata().get(['clientDefs', this.scope, 'dynamicLogic', 'options', this.field]);
        this.model.set('dynamicLogicOptions', dynamicLogicOptions);
        promiseList.push(this.createFieldView(null, 'dynamicLogicOptions', null, {
          view: 'views/admin/field-manager/fields/dynamic-logic-options',
          scope: this.scope
        }));
        this.hasDynamicLogicPanel = true;
      }
      if (!defs.dynamicLogicInvalidDisabled && !readOnly) {
        const dynamicLogicInvalid = this.getMetadata().get(['clientDefs', this.scope, 'dynamicLogic', 'fields', this.field, 'invalid']);
        this.model.set('dynamicLogicInvalid', dynamicLogicInvalid);
        promiseList.push(this.createFieldView(null, 'dynamicLogicInvalid', null, {
          view: 'views/admin/field-manager/fields/dynamic-logic-conditions',
          scope: this.scope
        }));
        this.hasDynamicLogicPanel = true;
      }
      return Promise.all(promiseList);
    }
    afterRender() {
      this.getView('name').on('change', () => {
        let name = this.model.get('name');
        let label = name;
        if (label.length) {
          label = label.charAt(0).toUpperCase() + label.slice(1);
        }
        this.model.set('label', label);
        if (name) {
          name = name.replace(/-/g, '').replace(/_/g, '').replace(/[^\w\s]/gi, '').replace(/ (.)/g, (match, g) => {
            return g.toUpperCase();
          }).replace(' ', '');
          if (name.length) {
            name = name.charAt(0).toLowerCase() + name.slice(1);
          }
        }
        this.model.set('name', name);
      });
    }
    readOnlyControl() {
      if (this.model.get('readOnly')) {
        this.hideField('dynamicLogicReadOnly');
        this.hideField('dynamicLogicRequired');
        this.hideField('dynamicLogicOptions');
        this.hideField('dynamicLogicInvalid');
      } else {
        this.showField('dynamicLogicReadOnly');
        this.showField('dynamicLogicRequired');
        this.showField('dynamicLogicOptions');
        this.showField('dynamicLogicInvalid');
      }
    }
    hideField(name) {
      const f = () => {
        const view = /** @type {import('views/fields/base').default} */
        this.getView(name);
        if (view) {
          this.$el.find('.cell[data-name="' + name + '"]').addClass('hidden');
          view.setDisabled();
        }
      };
      if (this.isRendered()) {
        f();
      } else {
        this.once('after:render', f);
      }
    }
    showField(name) {
      const f = () => {
        const view = /** @type {import('views/fields/base').default} */
        this.getView(name);
        if (view) {
          this.$el.find('.cell[data-name="' + name + '"]').removeClass('hidden');
          view.setNotDisabled();
        }
      };
      if (this.isRendered()) {
        f();
      } else {
        this.once('after:render', f);
      }
    }
    createFieldView(type, name, readOnly, params, options, callback) {
      const viewName = (params || {}).view || this.getFieldManager().getViewName(type);
      const o = {
        model: this.model,
        selector: `.field[data-name="${name}"]`,
        defs: {
          name: name,
          params: params
        },
        mode: readOnly ? 'detail' : 'edit',
        readOnly: readOnly,
        scope: this.scope,
        field: this.field
      };
      _.extend(o, options || {});
      const promise = this.createView(name, viewName, o, callback);
      this.fieldList.push(name);
      return promise;
    }
    disableButtons() {
      this.$el.find('[data-action="save"]').attr('disabled', 'disabled').addClass('disabled');
      this.$el.find('[data-action="resetToDefault"]').attr('disabled', 'disabled').addClass('disabled');
    }
    enableButtons() {
      this.$el.find('[data-action="save"]').removeAttr('disabled').removeClass('disabled');
      this.$el.find('[data-action="resetToDefault"]').removeAttr('disabled').removeClass('disabled');
    }
    save() {
      this.disableButtons();
      this.fieldList.forEach(field => {
        const view = /** @type {import('views/fields/base').default} */
        this.getView(field);
        if (!view.readOnly) {
          view.fetchToModel();
        }
      });
      let notValid = false;
      this.fieldList.forEach(field => {
        const view = /** @type {import('views/fields/base').default} */
        this.getView(field);
        notValid = view.validate() || notValid;
      });
      if (notValid) {
        Espo.Ui.error(this.translate('Not valid'));
        this.enableButtons();
        return;
      }
      if (this.model.get('tooltipText') && this.model.get('tooltipText') !== '') {
        this.model.set('tooltip', true);
      } else {
        this.model.set('tooltip', false);
      }
      const onSave = () => {
        Espo.Ui.notify(false);
        this.setIsNotChanged();
        this.enableButtons();
        Promise.all([this.getMetadata().loadSkipCache(), this.getLanguage().loadSkipCache()]).then(() => this.trigger('after:save'));
        this.model.fetchedAttributes = this.model.getClonedAttributes();
        this.broadcastUpdate();
      };
      Espo.Ui.notify(' ... ');
      if (this.isNew) {
        this.model.save().then(() => onSave()).catch(() => this.enableButtons());
        return;
      }
      const attributes = this.model.getClonedAttributes();
      if (this.model.fetchedAttributes.label === attributes.label) {
        delete attributes.label;
      }
      if (this.model.fetchedAttributes.tooltipText === attributes.tooltipText || !this.model.fetchedAttributes.tooltipText && !attributes.tooltipText) {
        delete attributes.tooltipText;
      }
      if ('translatedOptions' in attributes) {
        if (_.isEqual(this.model.fetchedAttributes.translatedOptions, attributes.translatedOptions)) {
          delete attributes.translatedOptions;
        }
      }
      this.model.save(attributes, {
        patch: true
      }).then(() => onSave()).catch(() => this.enableButtons());
    }
    resetToDefault() {
      this.confirm(this.translate('confirmation', 'messages'), () => {
        Espo.Ui.notify(this.translate('pleaseWait', 'messages'));
        Espo.Ajax.postRequest('FieldManager/action/resetToDefault', {
          scope: this.scope,
          name: this.field
        }).then(() => {
          Promise.all([this.getMetadata().loadSkipCache(), this.getLanguage().loadSkipCache()]).then(() => {
            this.setIsNotChanged();
            this.setupFieldData(() => {
              Espo.Ui.success(this.translate('Done'));
              this.reRender();
              this.broadcastUpdate();
            });
          });
        });
      });
    }
    broadcastUpdate() {
      this.getHelper().broadcastChannel.postMessage('update:metadata');
      this.getHelper().broadcastChannel.postMessage('update:language');
      this.getHelper().broadcastChannel.postMessage('update:settings');
    }
    actionClose() {
      this.setIsNotChanged();
      this.getRouter().navigate('#Admin/fieldManager/scope=' + this.scope, {
        trigger: true
      });
    }
    setConfirmLeaveOut(value) {
      this.getRouter().confirmLeaveOut = value;
    }
    setIsChanged() {
      this.isChanged = true;
      this.setConfirmLeaveOut(true);
    }
    setIsNotChanged() {
      this.isChanged = false;
      this.setConfirmLeaveOut(false);
    }
  }
  var _default = _exports.default = FieldManagerEditView;
});

define("views/admin/field-manager/modals/add-field", ["exports", "views/modal"], function (_exports, _modal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _modal.default {
    backdrop = true;
    template = 'admin/field-manager/modals/add-field';
    data() {
      return {
        typeList: this.typeList
      };
    }
    setup() {
      this.addActionHandler('addField', (e, target) => this.addField(target.dataset.type));
      this.addHandler('keyup', 'input[data-name="quick-search"]', (e, /** HTMLInputElement */target) => {
        this.processQuickSearch(target.value);
      });
      this.headerText = this.translate('Add Field', 'labels', 'Admin');
      this.typeList = [];

      /** @type {Record<string, Record>} */
      const fieldDefs = this.getMetadata().get('fields');
      Object.keys(this.getMetadata().get('fields')).forEach(type => {
        if (type in fieldDefs && !fieldDefs[type].notCreatable) {
          this.typeList.push(type);
        }
      });
      this.typeDataList = this.typeList.map(type => {
        return {
          type: type,
          label: this.translate(type, 'fieldTypes', 'Admin')
        };
      });
      this.typeList.sort((v1, v2) => {
        return this.translate(v1, 'fieldTypes', 'Admin').localeCompare(this.translate(v2, 'fieldTypes', 'Admin'));
      });
    }
    addField(type) {
      this.trigger('add-field', type);
      this.remove();
    }
    afterRender() {
      this.$noData = this.$el.find('.no-data');
      this.typeList.forEach(type => {
        let text = this.translate(type, 'fieldInfo', 'FieldManager');
        const $el = this.$el.find('a.info[data-name="' + type + '"]');
        if (text === type) {
          $el.addClass('hidden');
          return;
        }
        text = this.getHelper().transformMarkdownText(text, {
          linksInNewTab: true
        }).toString();
        Espo.Ui.popover($el, {
          content: text,
          placement: 'left'
        }, this);
      });
      setTimeout(() => this.$el.find('input[data-name="quick-search"]').focus(), 50);
    }
    processQuickSearch(text) {
      text = text.trim();
      const $noData = this.$noData;
      $noData.addClass('hidden');
      if (!text) {
        this.$el.find('ul .list-group-item').removeClass('hidden');
        return;
      }
      const matchedList = [];
      const lowerCaseText = text.toLowerCase();
      this.typeDataList.forEach(item => {
        const matched = item.label.toLowerCase().indexOf(lowerCaseText) === 0 || item.type.toLowerCase().indexOf(lowerCaseText) === 0;
        if (matched) {
          matchedList.push(item.type);
        }
      });
      if (matchedList.length === 0) {
        this.$el.find('ul .list-group-item').addClass('hidden');
        $noData.removeClass('hidden');
        return;
      }
      this.typeDataList.forEach(item => {
        const $row = this.$el.find(`ul .list-group-item[data-name="${item.type}"]`);
        if (!~matchedList.indexOf(item.type)) {
          $row.addClass('hidden');
          return;
        }
        $row.removeClass('hidden');
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/source-list", ["exports", "views/fields/multi-enum"], function (_exports, _multiEnum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _multiEnum.default {
    setupOptions() {
      this.params.options = Espo.Utils.clone(this.getMetadata().get('entityDefs.Attachment.sourceList') || []);
      this.translatedOptions = {};
      this.params.options.forEach(item => {
        this.translatedOptions[item] = this.translate(item, 'scopeNamesPlural');
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/pattern", ["exports", "views/fields/varchar"], function (_exports, _varchar) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _varchar = _interopRequireDefault(_varchar);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _varchar.default {
    noSpellCheck = true;
    setupOptions() {
      const patterns = this.getMetadata().get(['app', 'regExpPatterns']) || {};
      const patternList = Object.keys(patterns).filter(item => !patterns[item].isSystem).map(item => '$' + item);
      this.setOptionList(patternList);
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/options-with-style", ["exports", "views/admin/field-manager/fields/options"], function (_exports, _options) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _options = _interopRequireDefault(_options);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _options.default {
    setup() {
      super.setup();
      this.optionsStyleMap = this.model.get('style') || {};
      this.styleList = ['default', 'success', 'danger', 'warning', 'info', 'primary'];
      this.addActionHandler('selectOptionItemStyle', (e, target) => {
        const style = target.dataset.style;
        const value = target.dataset.value;
        this.changeStyle(value, style);
      });
    }
    changeStyle(value, style) {
      const val = CSS.escape(value);
      this.$el.find(`[data-action="selectOptionItemStyle"][data-value="${val}"] .check-icon`).addClass('hidden');
      this.$el.find(`[data-action="selectOptionItemStyle"][data-value="${val}"][data-style="${style}"] .check-icon`).removeClass('hidden');
      const $item = this.$el.find(`.list-group-item[data-value="${val}"]`).find('.item-text');
      this.styleList.forEach(item => {
        $item.removeClass('text-' + item);
      });
      $item.addClass('text-' + style);
      if (style === 'default') {
        style = null;
      }
      this.optionsStyleMap[value] = style;
    }
    getItemHtml(value) {
      // Do not use the `html` method to avoid XSS.

      const html = super.getItemHtml(value);
      const styleList = this.styleList;
      const styleMap = this.optionsStyleMap;
      let style = 'default';
      const $liList = [];
      styleList.forEach(item => {
        let isHidden = true;
        if (styleMap[value] === item) {
          style = item;
          isHidden = false;
        } else {
          if (item === 'default' && !styleMap[value]) {
            isHidden = false;
          }
        }
        const text = this.getLanguage().translateOption(item, 'style', 'LayoutManager');
        const $li = $('<li>').append($('<a>').attr('role', 'button').attr('tabindex', '0').attr('data-action', 'selectOptionItemStyle').attr('data-style', item).attr('data-value', value).append($('<span>').addClass('check-icon fas fa-check pull-right').addClass(isHidden ? 'hidden' : ''), $('<div>').addClass(`text-${item}`).text(text)));
        $liList.push($li);
      });
      const $dropdown = $('<div>').addClass('btn-group pull-right').append($('<button>').addClass('btn btn-link btn-sm dropdown-toggle').attr('type', 'button').attr('data-toggle', 'dropdown').append($('<span>').addClass('caret')), $('<ul>').addClass('dropdown-menu pull-right').append($liList));
      const $item = $(html);
      $item.find('.item-content > input').after($dropdown);
      $item.find('.item-text').addClass(`text-${style}`);
      $item.addClass('link-group-item-with-columns');
      return $item.get(0).outerHTML;
    }
    fetch() {
      const data = super.fetch();
      data.style = {};
      (data.options || []).forEach(item => {
        data.style[item] = this.optionsStyleMap[item] || null;
      });
      return data;
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/options-reference", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    enumFieldTypeList = ['enum', 'multiEnum', 'array', 'checklist', 'varchar'];
    setupOptions() {
      this.params.options = [''];
      const entityTypeList = Object.keys(this.getMetadata().get(['entityDefs'])).filter(item => this.getMetadata().get(['scopes', item, 'object'])).sort((s1, s2) => {
        return this.getLanguage().translate(s1, 'scopesName').localeCompare(this.getLanguage().translate(s2, 'scopesName'));
      });
      this.translatedOptions = {};
      entityTypeList.forEach(entityType => {
        const fieldList = Object.keys(this.getMetadata().get(['entityDefs', entityType, 'fields']) || []).filter(item => entityType !== this.model.scope || item !== this.model.get('name')).sort((s1, s2) => {
          return this.getLanguage().translate(s1, 'fields', entityType).localeCompare(this.getLanguage().translate(s2, 'fields', entityType));
        });
        fieldList.forEach(field => {
          const {
            type,
            options,
            optionsPath,
            optionsReference
          } = this.getMetadata().get(['entityDefs', entityType, 'fields', field]) || {};
          if (!this.enumFieldTypeList.includes(type)) {
            return;
          }
          if (optionsPath || optionsReference) {
            return;
          }
          if (!options) {
            return;
          }
          const value = `${entityType}.${field}`;
          this.params.options.push(value);
          this.translatedOptions[value] = this.translate(entityType, 'scopeName') + ' · ' + this.translate(field, 'fields', entityType);
        });
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/not-actual-options", ["exports", "views/fields/multi-enum"], function (_exports, _multiEnum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class NotActualOptionsFieldView extends _multiEnum.default {
    setup() {
      super.setup();
      this.params.options = Espo.Utils.clone(this.model.get('options')) || [];
      this.listenTo(this.model, 'change:options', (/** import('model').default */model) => {
        this.params.options = Espo.Utils.clone(model.get('options')) || [];
        this.reRender();
      });
    }
  }
  var _default = _exports.default = NotActualOptionsFieldView;
});

define("views/admin/field-manager/fields/entity-list", ["exports", "views/fields/entity-type-list"], function (_exports, _entityTypeList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _entityTypeList = _interopRequireDefault(_entityTypeList);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _entityTypeList.default {}
  _exports.default = _default;
});

define("views/admin/field-manager/fields/dynamic-logic-options", ["exports", "views/fields/base", "model"], function (_exports, _base, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    editTemplate = 'admin/field-manager/fields/dynamic-logic-options/edit';
    data() {
      return {
        itemDataList: this.itemDataList
      };
    }
    setup() {
      this.addActionHandler('editConditions', (e, target) => this.edit(parseInt(target.dataset.index)));
      this.addActionHandler('removeOptionList', (e, target) => this.removeItem(parseInt(target.dataset.index)));
      this.addActionHandler('addOptionList', () => this.addOptionList());
      this.optionsDefsList = Espo.Utils.cloneDeep(this.model.get(this.name)) || [];
      this.scope = this.options.scope;
      this.setupItems();
      this.setupItemViews();
    }
    setupItems() {
      this.itemDataList = [];
      this.optionsDefsList.forEach((item, i) => {
        this.itemDataList.push({
          conditionGroupViewKey: `conditionGroup${i.toString()}`,
          optionsViewKey: 'options' + i.toString(),
          index: i
        });
      });
    }
    setupItemViews() {
      this.optionsDefsList.forEach((item, i) => {
        this.createStringView(i);
        this.createOptionsView(i);
      });
    }
    createOptionsView(num) {
      const key = `options${num.toString()}`;
      if (!this.optionsDefsList[num]) {
        return;
      }
      const model = new _model.default();
      model.set('options', this.optionsDefsList[num].optionList || []);
      this.createView(key, 'views/fields/multi-enum', {
        selector: `.options-container[data-key="${key}"]`,
        model: model,
        name: 'options',
        mode: 'edit',
        params: {
          options: this.model.get('options'),
          translatedOptions: this.model.get('translatedOptions')
        }
      }, view => {
        if (this.isRendered()) {
          view.render();
        }
        this.listenTo(this.model, 'change:options', () => {
          view.setTranslatedOptions(this.getTranslatedOptions());
          view.setOptionList(this.model.get('options'));
        });
        this.listenTo(model, 'change', () => {
          this.optionsDefsList[num].optionList = model.get('options') || [];
        });
      });
    }
    getTranslatedOptions() {
      if (this.model.get('translatedOptions')) {
        return this.model.get('translatedOptions');
      }
      const translatedOptions = {};
      const list = this.model.get('options') || [];
      list.forEach(value => {
        translatedOptions[value] = this.getLanguage().translateOption(value, this.options.field, this.options.scope);
      });
      return translatedOptions;
    }
    createStringView(num) {
      const key = 'conditionGroup' + num.toString();
      if (!this.optionsDefsList[num]) {
        return;
      }
      this.createView(key, 'views/admin/dynamic-logic/conditions-string/group-base', {
        selector: `.string-container[data-key="${key}"]`,
        itemData: {
          value: this.optionsDefsList[num].conditionGroup
        },
        operator: 'and',
        scope: this.scope
      }, view => {
        if (this.isRendered()) {
          view.render();
        }
      });
    }
    edit(num) {
      this.createView('modal', 'views/admin/dynamic-logic/modals/edit', {
        conditionGroup: this.optionsDefsList[num].conditionGroup,
        scope: this.options.scope
      }, view => {
        view.render();
        this.listenTo(view, 'apply', conditionGroup => {
          this.optionsDefsList[num].conditionGroup = conditionGroup;
          this.trigger('change');
          this.createStringView(num);
        });
      });
    }
    addOptionList() {
      this.optionsDefsList.push({
        optionList: this.model.get('options') || [],
        conditionGroup: null
      });
      this.setupItems();
      this.reRender();
      this.setupItemViews();
      this.trigger('change');
    }
    removeItem(num) {
      this.optionsDefsList.splice(num, 1);
      this.setupItems();
      this.reRender();
      this.setupItemViews();
      this.trigger('change');
    }
    fetch() {
      const data = {};
      data[this.name] = this.optionsDefsList;
      if (!this.optionsDefsList.length) {
        data[this.name] = null;
      }
      return data;
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/dynamic-logic-conditions", ["exports", "views/fields/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    detailTemplate = 'admin/field-manager/fields/dynamic-logic-conditions/detail';
    editTemplate = 'admin/field-manager/fields/dynamic-logic-conditions/edit';
    setup() {
      this.addActionHandler('editConditions', () => this.edit());
      this.conditionGroup = Espo.Utils.cloneDeep((this.model.get(this.name) || {}).conditionGroup || []);
      this.scope = this.params.scope || this.options.scope;
      this.createStringView();
    }
    createStringView() {
      this.createView('conditionGroup', 'views/admin/dynamic-logic/conditions-string/group-base', {
        selector: '.top-group-string-container',
        itemData: {
          value: this.conditionGroup
        },
        operator: 'and',
        scope: this.scope
      }, view => {
        if (this.isRendered()) {
          view.render();
        }
      });
    }
    edit() {
      this.createView('modal', 'views/admin/dynamic-logic/modals/edit', {
        conditionGroup: this.conditionGroup,
        scope: this.scope
      }, view => {
        view.render();
        this.listenTo(view, 'apply', conditionGroup => {
          this.conditionGroup = conditionGroup;
          this.trigger('change');
          this.createStringView();
        });
      });
    }
    fetch() {
      const data = {};
      data[this.name] = {
        conditionGroup: this.conditionGroup
      };
      if (this.conditionGroup.length === 0) {
        data[this.name] = null;
      }
      return data;
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/currency-default", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    fetchEmptyValueAsNull = true;
    setupOptions() {
      this.params.options = [''];
      (this.getConfig().get('currencyList') || []).forEach(item => {
        this.params.options.push(item);
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/text/attachment-field", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setupOptions() {
      const entityType = this.options.scope;
      this.params.translation = `${entityType}.fields`;
      const fieldList = this.getFieldManager().getEntityTypeFieldList(entityType, {
        typeList: ['attachmentMultiple']
      });
      this.setOptionList(['', ...fieldList]);
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/phone/default", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setup() {
      super.setup();
      this.setOptionList(this.model.get('typeList') || ['']);
      this.listenTo(this.model, 'change:typeList', () => {
        this.setOptionList(this.model.get('typeList') || ['']);
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/options/default", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setup() {
      super.setup();
      this.validations.push(() => this.validateListed());
      this.updateAvailableOptions();
      this.listenTo(this.model, 'change', () => {
        if (!this.model.hasChanged('options') && !this.model.hasChanged('optionsReference')) {
          return;
        }
        this.updateAvailableOptions();
      });
    }
    updateAvailableOptions() {
      this.setOptionList(this.getAvailableOptions());
    }
    getAvailableOptions() {
      const optionsReference = this.model.get('optionsReference');
      if (optionsReference) {
        const [entityType, field] = optionsReference.split('.');
        const options = this.getMetadata().get(`entityDefs.${entityType}.fields.${field}.options`) || [''];
        return Espo.Utils.clone(options);
      }
      return this.model.get('options') || [''];
    }
    validateListed() {
      const value = this.model.get(this.name) ?? '';
      if (!this.params.options) {
        return false;
      }
      const options = this.getAvailableOptions();
      if (options.indexOf(value) === -1) {
        const msg = this.translate('fieldInvalid', 'messages').replace('{field}', this.getLabelText());
        this.showValidationMessage(msg);
        return true;
      }
      return false;
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/options/default-multi", ["exports", "views/fields/multi-enum"], function (_exports, _multiEnum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _multiEnum.default {
    setup() {
      super.setup();
      this.validations.push(() => this.validateListed());
      this.updateAvailableOptions();
      this.listenTo(this.model, 'change', () => {
        if (!this.model.hasChanged('options') && !this.model.hasChanged('optionsReference')) {
          return;
        }
        this.updateAvailableOptions();
      });
    }
    updateAvailableOptions() {
      this.setOptionList(this.getAvailableOptions());
    }
    getAvailableOptions() {
      const optionsReference = this.model.get('optionsReference');
      if (optionsReference) {
        const [entityType, field] = optionsReference.split('.');
        const options = this.getMetadata().get(`entityDefs.${entityType}.fields.${field}.options`) || [];
        return Espo.Utils.clone(options);
      }
      return this.model.get('options') || [];
    }
    validateListed() {
      /** @type string[] */
      const values = this.model.get(this.name) ?? [];
      if (!this.params.options) {
        return false;
      }
      const options = this.getAvailableOptions();
      for (const value of values) {
        if (options.indexOf(value) === -1) {
          const msg = this.translate('fieldInvalid', 'messages').replace('{field}', this.getLabelText());
          this.showValidationMessage(msg);
          return true;
        }
      }
      return false;
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/link-multiple/default", ["exports", "views/fields/link-multiple"], function (_exports, _linkMultiple) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _linkMultiple = _interopRequireDefault(_linkMultiple);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _linkMultiple.default {
    data() {
      const defaultAttributes = this.model.get('defaultAttributes') || {};
      const nameHash = defaultAttributes[this.options.field + 'Names'] || {};
      const idValues = defaultAttributes[this.options.field + 'Ids'] || [];
      const data = super.data();
      data.nameHash = nameHash;
      data.idValues = idValues;
      return data;
    }
    setup() {
      super.setup();
      this.foreignScope = this.getMetadata().get(['entityDefs', this.options.scope, 'links', this.options.field, 'entity']);
    }
    fetch() {
      const data = super.fetch();
      let defaultAttributes = {};
      defaultAttributes[this.options.field + 'Ids'] = data[this.idsName];
      defaultAttributes[this.options.field + 'Names'] = data[this.nameHashName];
      if (data[this.idsName] === null || data[this.idsName].length === 0) {
        defaultAttributes = null;
      }
      return {
        defaultAttributes: defaultAttributes
      };
    }
    copyValuesFromModel() {
      const defaultAttributes = this.model.get('defaultAttributes') || {};
      const idValues = defaultAttributes[this.options.field + 'Ids'] || [];
      const nameHash = defaultAttributes[this.options.field + 'Names'] || {};
      this.ids = idValues;
      this.nameHash = nameHash;
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/link/default", ["exports", "views/fields/link"], function (_exports, _link) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _link = _interopRequireDefault(_link);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _link.default {
    data() {
      const defaultAttributes = this.model.get('defaultAttributes') || {};
      const nameValue = defaultAttributes[this.options.field + 'Name'] || null;
      const idValue = defaultAttributes[this.options.field + 'Id'] || null;
      const data = super.data();
      data.nameValue = nameValue;
      data.idValue = idValue;
      return data;
    }
    setup() {
      super.setup();
      this.foreignScope = this.getMetadata().get(['entityDefs', this.options.scope, 'links', this.options.field, 'entity']);
    }
    fetch() {
      const data = super.fetch();
      let defaultAttributes = {};
      defaultAttributes[this.options.field + 'Id'] = data[this.idName];
      defaultAttributes[this.options.field + 'Name'] = data[this.nameName];
      if (data[this.idName] === null) {
        defaultAttributes = null;
      }
      return {
        defaultAttributes: defaultAttributes
      };
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/int/max", ["exports", "views/fields/int"], function (_exports, _int) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _int = _interopRequireDefault(_int);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _int.default {
    setupAutoNumericOptions() {
      super.setupAutoNumericOptions();
      if (this.params.max == null) {
        this.autoNumericOptions.maximumValue = '9223372036854775807';
      }
      if (this.params.min == null) {
        this.autoNumericOptions.minimumValue = '-9223372036854775808';
      }
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/foreign/link", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setup() {
      super.setup();
      if (!this.model.isNew()) {
        this.setReadOnly(true);
      }
    }
    setupOptions() {
      /** @type {Record<string, Record>} */
      const links = this.getMetadata().get(['entityDefs', this.options.scope, 'links']) || {};
      this.params.options = Object.keys(Espo.Utils.clone(links)).filter(item => {
        if (links[item].type !== 'belongsTo' && links[item].type !== 'hasOne') {
          return;
        }
        if (links[item].noJoin) {
          return;
        }
        if (links[item].disabled) {
          return;
        }
        if (links[item].utility) {
          return;
        }
        return true;
      });
      const scope = this.options.scope;
      this.translatedOptions = {};
      this.params.options.forEach(item => {
        this.translatedOptions[item] = this.translate(item, 'links', scope);
      });
      this.params.options = this.params.options.sort((v1, v2) => {
        return this.translate(v1, 'links', scope).localeCompare(this.translate(v2, 'links', scope));
      });
      this.params.options.unshift('');
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/foreign/field", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setup() {
      super.setup();
      if (!this.model.isNew()) {
        this.setReadOnly(true);
      }
      this.listenTo(this.model, 'change:field', () => {
        this.manageField();
      });
      this.viewValue = this.model.get('view');
    }
    setupOptions() {
      this.listenTo(this.model, 'change:link', () => {
        this.setupOptionsByLink();
        this.reRender();
      });
      this.setupOptionsByLink();
    }
    setupOptionsByLink() {
      this.typeList = this.getMetadata().get(['fields', 'foreign', 'fieldTypeList']);
      const link = this.model.get('link');
      if (!link) {
        this.params.options = [''];
        return;
      }
      const scope = this.getMetadata().get(['entityDefs', this.options.scope, 'links', link, 'entity']);
      if (!scope) {
        this.params.options = [''];
        return;
      }

      /** @type {Record<string, Record>} */
      const fields = this.getMetadata().get(['entityDefs', scope, 'fields']) || {};
      this.params.options = Object.keys(Espo.Utils.clone(fields)).filter(item => {
        const type = fields[item].type;
        if (!~this.typeList.indexOf(type)) {
          return;
        }
        if (fields[item].disabled || fields[item].utility || fields[item].directAccessDisabled || fields[item].notStorable) {
          return;
        }
        return true;
      });
      this.translatedOptions = {};
      this.params.options.forEach(item => {
        this.translatedOptions[item] = this.translate(item, 'fields', scope);
      });
      this.params.options = this.params.options.sort((v1, v2) => {
        return this.translate(v1, 'fields', scope).localeCompare(this.translate(v2, 'fields', scope));
      });
      this.params.options.unshift('');
    }
    manageField() {
      if (!this.model.isNew()) {
        return;
      }
      const link = this.model.get('link');
      const field = this.model.get('field');
      if (!link || !field) {
        return;
      }
      const scope = this.getMetadata().get(['entityDefs', this.options.scope, 'links', link, 'entity']);
      if (!scope) {
        return;
      }
      const type = this.getMetadata().get(['entityDefs', scope, 'fields', field, 'type']);
      this.viewValue = this.getMetadata().get(['fields', 'foreign', 'fieldTypeViewMap', type]);
    }
    fetch() {
      const data = super.fetch();
      if (this.model.isNew()) {
        if (this.viewValue) {
          data['view'] = this.viewValue;
        }
      }
      return data;
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/date/default", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    fetch() {
      const data = super.fetch();
      if (data[this.name] === '') {
        data[this.name] = null;
      }
      return data;
    }
    setupOptions() {
      super.setupOptions();
      const value = this.model.get(this.name);
      if (this.params.options && value && !~this.params.options.indexOf(value)) {
        this.params.options.push(value);
      }
    }
  }
  _exports.default = _default;
});

define("views/admin/field-manager/fields/date/after-before", ["exports", "views/fields/varchar"], function (_exports, _varchar) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _varchar = _interopRequireDefault(_varchar);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _varchar.default {
    setupOptions() {
      super.setupOptions();
      if (!this.options.scope) {
        return;
      }
      let list = this.getFieldManager().getEntityTypeFieldList(this.options.scope, {
        typeList: ['date', 'datetime', 'datetimeOptional']
      });
      if (this.model.get('name')) {
        list = list.filter(item => {
          return item !== this.model.get('name');
        });
      }
      this.params.options = list;
    }
  }
  _exports.default = _default;
});

define("views/admin/extensions/ready", ["exports", "views/modal"], function (_exports, _modal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _modal.default {
    template = 'admin/extensions/ready';
    cssName = 'ready-modal';
    createButton = true;
    data() {
      return {
        version: this.upgradeData.version,
        text: this.translate('installExtension', 'messages', 'Admin').replace('{version}', this.upgradeData.version).replace('{name}', this.upgradeData.name)
      };
    }
    setup() {
      this.buttonList = [{
        name: 'run',
        text: this.translate('Install', 'labels', 'Admin'),
        style: 'danger',
        onClick: () => this.actionRun()
      }, {
        name: 'cancel',
        label: 'Cancel'
      }];
      this.upgradeData = this.options.upgradeData;
      this.headerText = this.getLanguage().translate('Ready for installation', 'labels', 'Admin');
    }
    actionRun() {
      this.trigger('run');
      this.remove();
    }
  }
  _exports.default = _default;
});

define("views/admin/extensions/index", ["exports", "view", "helpers/list/select-provider"], function (_exports, _view, _selectProvider) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _selectProvider = _interopRequireDefault(_selectProvider);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class IndexExtensionsView extends _view.default {
    template = 'admin/extensions/index';
    packageContents = null;
    events = {
      /** @this IndexExtensionsView */
      'change input[name="package"]': function (e) {
        this.$el.find('button[data-action="upload"]').addClass('disabled').attr('disabled', 'disabled');
        this.$el.find('.message-container').html('');
        const files = e.currentTarget.files;
        if (files.length) {
          this.selectFile(files[0]);
        }
      },
      /** @this IndexExtensionsView */
      'click button[data-action="upload"]': function () {
        this.upload();
      },
      /** @this IndexExtensionsView */
      'click [data-action="install"]': function (e) {
        const id = $(e.currentTarget).data('id');
        const name = this.collection.get(id).get('name');
        const version = this.collection.get(id).get('version');
        this.run(id, name, version);
      },
      /** @this IndexExtensionsView */
      'click [data-action="uninstall"]': function (e) {
        const id = $(e.currentTarget).data('id');
        this.confirm(this.translate('uninstallConfirmation', 'messages', 'Admin'), () => {
          Espo.Ui.notify(this.translate('Uninstalling...', 'labels', 'Admin'));
          Espo.Ajax.postRequest('Extension/action/uninstall', {
            id: id
          }, {
            timeout: 0,
            bypassAppReload: true
          }).then(() => {
            Espo.Ui.success(this.translate('Done'));
            setTimeout(() => window.location.reload(), 500);
          }).catch(xhr => {
            const msg = xhr.getResponseHeader('X-Status-Reason');
            this.showErrorNotification(this.translate('Error') + ': ' + msg);
          });
        });
      }
    };
    setup() {
      const selectProvider = new _selectProvider.default(this.getHelper().layoutManager, this.getHelper().metadata, this.getHelper().fieldManager);
      this.wait(this.getCollectionFactory().create('Extension').then(collection => {
        this.collection = collection;
        this.collection.maxSize = this.getConfig().get('recordsPerPage');
      }).then(() => selectProvider.get('Extension')).then(select => {
        this.collection.data.select = select.join(',');
      }).then(() => this.collection.fetch()).then(() => {
        this.createView('list', 'views/extension/record/list', {
          collection: this.collection,
          selector: '> .list-container'
        });
        if (this.collection.length === 0) {
          this.once('after:render', () => {
            this.$el.find('.list-container').addClass('hidden');
          });
        }
      }));
    }
    selectFile(file) {
      const fileReader = new FileReader();
      fileReader.onload = e => {
        this.packageContents = e.target.result;
        this.$el.find('button[data-action="upload"]').removeClass('disabled').removeAttr('disabled');
        const maxSize = this.getHelper().getAppParam('maxUploadSize') || 0;
        if (file.size > maxSize * 1024 * 1024) {
          const body = this.translate('fileExceedsMaxUploadSize', 'messages', 'Extension').replace('{maxSize}', maxSize + 'MB');
          Espo.Ui.dialog({
            body: this.getHelper().transformMarkdownText(body).toString(),
            buttonList: [{
              name: 'close',
              text: this.translate('Close'),
              onClick: dialog => dialog.close()
            }]
          }).show();
        }
      };
      fileReader.readAsDataURL(file);
    }
    showError(msg) {
      msg = this.translate(msg, 'errors', 'Admin');
      this.$el.find('.message-container').html(msg);
    }
    showErrorNotification(msg) {
      if (!msg) {
        this.$el.find('.notify-text').addClass('hidden');
        return;
      }
      msg = this.translate(msg, 'errors', 'Admin');
      this.$el.find('.notify-text').html(msg);
      this.$el.find('.notify-text').removeClass('hidden');
    }
    upload() {
      this.$el.find('button[data-action="upload"]').addClass('disabled').attr('disabled', 'disabled');
      Espo.Ui.notify(this.translate('Uploading...'));
      Espo.Ajax.postRequest('Extension/action/upload', this.packageContents, {
        timeout: 0,
        contentType: 'application/zip'
      }).then(data => {
        if (!data.id) {
          this.showError(this.translate('Error occurred'));
          return;
        }
        Espo.Ui.notify(false);
        this.createView('popup', 'views/admin/extensions/ready', {
          upgradeData: data
        }, view => {
          view.render();
          this.$el.find('button[data-action="upload"]').removeClass('disabled').removeAttr('disabled');
          view.once('run', () => {
            view.close();
            this.$el.find('.panel.upload').addClass('hidden');
            this.run(data.id, data.version, data.name);
          });
        });
      }).catch(xhr => {
        this.showError(xhr.getResponseHeader('X-Status-Reason'));
        Espo.Ui.notify(false);
      });
    }
    run(id, version, name) {
      Espo.Ui.notify(this.translate('pleaseWait', 'messages'));
      this.showError(false);
      this.showErrorNotification(false);
      Espo.Ajax.postRequest('Extension/action/install', {
        id: id
      }, {
        timeout: 0,
        bypassAppReload: true
      }).then(() => {
        const cache = this.getCache();
        if (cache) {
          cache.clear();
        }
        this.createView('popup', 'views/admin/extensions/done', {
          version: version,
          name: name
        }, view => {
          if (this.collection.length) {
            this.collection.fetch({
              bypassAppReload: true
            });
          }
          this.$el.find('.list-container').removeClass('hidden');
          this.$el.find('.panel.upload').removeClass('hidden');
          Espo.Ui.notify(false);
          view.render();
        });
      }).catch(xhr => {
        this.$el.find('.panel.upload').removeClass('hidden');
        const msg = xhr.getResponseHeader('X-Status-Reason');
        this.showErrorNotification(this.translate('Error') + ': ' + msg);
      });
    }
  }
  var _default = _exports.default = IndexExtensionsView;
});

define("views/admin/extensions/done", ["exports", "views/modal"], function (_exports, _modal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _modal.default {
    template = 'admin/extensions/done';
    cssName = 'done-modal';
    createButton = true;
    data() {
      return {
        version: this.options.version,
        name: this.options.name,
        text: this.translate('extensionInstalled', 'messages', 'Admin').replace('{version}', this.options.version).replace('{name}', this.options.name)
      };
    }
    setup() {
      this.on('remove', () => {
        window.location.reload();
      });
      this.buttonList = [{
        name: 'close',
        label: 'Close'
      }];
      this.headerText = this.getLanguage().translate('Installed successfully', 'labels', 'Admin');
    }
  }
  _exports.default = _default;
});

define("views/admin/entity-manager/scope", ["exports", "view", "views/record/detail", "model", "views/admin/entity-manager/fields/primary-filters"], function (_exports, _view, _detail, _model, _primaryFilters) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _detail = _interopRequireDefault(_detail);
  _model = _interopRequireDefault(_model);
  _primaryFilters = _interopRequireDefault(_primaryFilters);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class EntityManagerScopeView extends _view.default {
    template = 'admin/entity-manager/scope';
    scope;
    data() {
      return {
        scope: this.scope,
        isEditable: this.isEditable,
        isRemovable: this.isRemovable,
        isCustomizable: this.isCustomizable,
        type: this.type,
        hasLayouts: this.hasLayouts,
        label: this.label,
        hasFormula: this.hasFormula,
        hasFields: this.hasFields,
        hasRelationships: this.hasRelationships
      };
    }
    events = {
      /** @this EntityManagerScopeView */
      'click [data-action="editEntity"]': function () {
        this.getRouter().navigate(`#Admin/entityManager/edit&scope=${this.scope}`, {
          trigger: true
        });
      },
      /** @this EntityManagerScopeView */
      'click [data-action="removeEntity"]': function () {
        this.removeEntity();
      },
      /** @this EntityManagerScopeView */
      'click [data-action="editFormula"]': function () {
        this.editFormula();
      }
    };
    setup() {
      this.scope = this.options.scope;
      this.setupScopeData();
      this.model = new _model.default({
        name: this.scope,
        type: this.type,
        label: this.label,
        primaryFilters: this.getPrimaryFilters()
      });
      this.model.setDefs({
        fields: {
          name: {
            type: 'varchar'
          },
          type: {
            type: 'varchar'
          },
          label: {
            type: 'varchar'
          },
          primaryFilters: {
            type: 'array'
          }
        }
      });
      this.recordView = new _detail.default({
        model: this.model,
        inlineEditDisabled: true,
        buttonsDisabled: true,
        readOnly: true,
        detailLayout: [{
          tabBreak: true,
          tabLabel: this.translate('General', 'labels', 'Settings'),
          rows: [[{
            name: 'name',
            labelText: this.translate('name', 'fields', 'EntityManager')
          }, {
            name: 'type',
            labelText: this.translate('type', 'fields', 'EntityManager')
          }], [{
            name: 'label',
            labelText: this.translate('label', 'fields', 'EntityManager')
          }, false]]
        }, {
          tabBreak: true,
          tabLabel: this.translate('Details'),
          rows: [[{
            view: new _primaryFilters.default({
              name: 'primaryFilters',
              labelText: this.translate('primaryFilters', 'fields', 'EntityManager'),
              targetEntityType: this.scope
            })
          }, false]]
        }]
      });
      this.assignView('record', this.recordView, '.record-container');
      if (!this.type) {
        this.recordView.hideField('type');
      }
    }
    setupScopeData() {
      const scopeData = /** @type {Record} */this.getMetadata().get(['scopes', this.scope]);
      const entityManagerData = this.getMetadata().get(['scopes', this.scope, 'entityManager']) || {};
      if (!scopeData) {
        throw new Espo.Exceptions.NotFound();
      }
      this.isRemovable = !!scopeData.isCustom;
      if (scopeData.isNotRemovable) {
        this.isRemovable = false;
      }
      this.isCustomizable = !!scopeData.customizable;
      this.type = scopeData.type;
      this.isEditable = true;
      this.hasLayouts = scopeData.layouts;
      this.hasFormula = this.isCustomizable;
      this.hasFields = this.isCustomizable;
      this.hasRelationships = this.isCustomizable;
      if (!scopeData.customizable) {
        this.isEditable = false;
      }
      if ('edit' in entityManagerData) {
        this.isEditable = entityManagerData.edit;
      }
      if ('layouts' in entityManagerData) {
        this.hasLayouts = entityManagerData.layouts;
      }
      if ('formula' in entityManagerData) {
        this.hasFormula = entityManagerData.formula;
      }
      if ('fields' in entityManagerData) {
        this.hasFields = entityManagerData.fields;
      }
      if ('relationships' in entityManagerData) {
        this.hasRelationships = entityManagerData.relationships;
      }
      this.label = this.getLanguage().translate(this.scope, 'scopeNames');
    }
    editFormula() {
      Espo.Ui.notify(' ... ');
      Espo.loader.requirePromise('views/admin/entity-manager/modals/select-formula').then(View => {
        /** @type {module:views/modal} */
        const view = new View({
          scope: this.scope
        });
        this.assignView('dialog', view).then(() => {
          Espo.Ui.notify(false);
          view.render();
        });
      });
    }
    removeEntity() {
      const scope = this.scope;
      this.confirm(this.translate('confirmRemove', 'messages', 'EntityManager'), () => {
        Espo.Ui.notify(this.translate('pleaseWait', 'messages'));
        this.disableButtons();
        Espo.Ajax.postRequest('EntityManager/action/removeEntity', {
          name: scope
        }).then(() => {
          this.getMetadata().loadSkipCache().then(() => {
            this.getConfig().load().then(() => {
              Espo.Ui.notify(false);
              this.broadcastUpdate();
              this.getRouter().navigate('#Admin/entityManager', {
                trigger: true
              });
            });
          });
        }).catch(() => this.enableButtons());
      });
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Entity Manager', 'labels', 'Admin'));
    }
    disableButtons() {
      this.$el.find('.btn.action').addClass('disabled').attr('disabled', 'disabled');
      this.$el.find('.item-dropdown-button').addClass('disabled').attr('disabled', 'disabled');
    }
    enableButtons() {
      this.$el.find('.btn.action').removeClass('disabled').removeAttr('disabled');
      this.$el.find('.item-dropdown-button"]').removeClass('disabled').removeAttr('disabled');
    }
    broadcastUpdate() {
      this.getHelper().broadcastChannel.postMessage('update:metadata');
      this.getHelper().broadcastChannel.postMessage('update:settings');
    }

    /**
     * @return {string[]}
     */
    getPrimaryFilters() {
      const list = this.getMetadata().get(`clientDefs.${this.scope}.filterList`, []).map(item => {
        if (typeof item === 'object' && item.name) {
          return item.name;
        }
        return item.toString();
      });
      if (this.getMetadata().get(`scopes.${this.scope}.stars`)) {
        list.unshift('starred');
      }
      return list;
    }
  }
  var _default = _exports.default = EntityManagerScopeView;
});

define("views/admin/entity-manager/index", ["exports", "view", "views/admin/entity-manager/modals/export"], function (_exports, _view, _export) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _export = _interopRequireDefault(_export);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class EntityManagerIndexView extends _view.default {
    template = 'admin/entity-manager/index';
    scopeDataList = null;
    scope = null;
    data() {
      return {
        scopeDataList: this.scopeDataList
      };
    }
    events = {
      /** @this EntityManagerIndexView */
      'click button[data-action="createEntity"]': function () {
        this.getRouter().navigate('#Admin/entityManager/create&', {
          trigger: true
        });
      },
      /** @this EntityManagerIndexView */
      'keyup input[data-name="quick-search"]': function (e) {
        this.processQuickSearch(e.currentTarget.value);
      }
    };
    setupScopeData() {
      this.scopeDataList = [];
      let scopeList = Object.keys(this.getMetadata().get('scopes')).sort((v1, v2) => {
        return v1.localeCompare(v2);
      });
      const scopeListSorted = [];
      scopeList.forEach(scope => {
        const d = this.getMetadata().get('scopes.' + scope);
        if (d.entity && d.customizable) {
          scopeListSorted.push(scope);
        }
      });
      scopeList.forEach(scope => {
        const d = this.getMetadata().get('scopes.' + scope);
        if (d.entity && !d.customizable) {
          scopeListSorted.push(scope);
        }
      });
      scopeList = scopeListSorted;
      scopeList.forEach(scope => {
        const defs = /** @type {Record} */this.getMetadata().get('scopes.' + scope);
        let isRemovable = !!defs.isCustom;
        if (defs.isNotRemovable) {
          isRemovable = false;
        }
        this.scopeDataList.push({
          name: scope,
          isCustom: defs.isCustom,
          isRemovable: isRemovable,
          hasView: defs.customizable,
          type: defs.type,
          label: this.getLanguage().translate(scope, 'scopeNames'),
          layouts: defs.layouts,
          module: defs.module !== 'Crm' ? defs.module : null
        });
      });
    }
    setup() {
      this.setupScopeData();
      this.addActionHandler('export', () => this.actionExport());
    }
    afterRender() {
      this.$noData = this.$el.find('.no-data');
      this.$el.find('input[data-name="quick-search"]').focus();
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Entity Manager', 'labels', 'Admin'));
    }
    processQuickSearch(text) {
      text = text.trim();
      const $noData = this.$noData;
      $noData.addClass('hidden');
      if (!text) {
        this.$el.find('table tr.scope-row').removeClass('hidden');
        return;
      }
      const matchedList = [];
      const lowerCaseText = text.toLowerCase();
      this.scopeDataList.forEach(item => {
        let matched = false;
        if (item.label.toLowerCase().indexOf(lowerCaseText) === 0 || item.name.toLowerCase().indexOf(lowerCaseText) === 0) {
          matched = true;
        }
        if (!matched) {
          const wordList = item.label.split(' ').concat(item.label.split(' '));
          wordList.forEach(word => {
            if (word.toLowerCase().indexOf(lowerCaseText) === 0) {
              matched = true;
            }
          });
        }
        if (matched) {
          matchedList.push(item.name);
        }
      });
      if (matchedList.length === 0) {
        this.$el.find('table tr.scope-row').addClass('hidden');
        $noData.removeClass('hidden');
        return;
      }
      this.scopeDataList.map(item => item.name).forEach(scope => {
        if (!~matchedList.indexOf(scope)) {
          this.$el.find('table tr.scope-row[data-scope="' + scope + '"]').addClass('hidden');
          return;
        }
        this.$el.find('table tr.scope-row[data-scope="' + scope + '"]').removeClass('hidden');
      });
    }
    actionExport() {
      const view = new _export.default();
      this.assignView('dialog', view).then(() => {
        view.render();
      });
    }
  }
  var _default = _exports.default = EntityManagerIndexView;
});

define("views/admin/entity-manager/formula", ["exports", "view", "model", "views/admin/entity-manager/record/edit-formula", "underscore"], function (_exports, _view, _model, _editFormula, _underscore) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _model = _interopRequireDefault(_model);
  _editFormula = _interopRequireDefault(_editFormula);
  _underscore = _interopRequireDefault(_underscore);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class EntityManagerFormulaView extends _view.default {
    template = 'admin/entity-manager/formula';

    /** @type {string} */
    scope;
    attributes;
    data() {
      return {
        scope: this.scope,
        type: this.type
      };
    }
    setup() {
      this.addActionHandler('save', () => this.actionSave());
      this.addActionHandler('close', () => this.actionClose());
      this.addActionHandler('resetToDefault', () => this.actionResetToDefault());
      this.addHandler('keydown.form', '', 'onKeyDown');
      this.scope = this.options.scope;
      this.type = this.options.type;
      if (!this.scope || !this.type) {
        throw Error("No scope or type.");
      }
      if (!this.getMetadata().get(['scopes', this.scope, 'customizable']) || this.getMetadata().get(`scopes.${this.scope}.entityManager.formula`) === false) {
        throw new Espo.Exceptions.NotFound("Entity type is not customizable.");
      }
      if (!['beforeSaveCustomScript', 'beforeSaveApiScript'].includes(this.type)) {
        Espo.Ui.error('No allowed formula type.', true);
        throw new Espo.Exceptions.NotFound('No allowed formula type specified.');
      }
      this.model = new _model.default();
      this.model.name = 'EntityManager';
      this.wait(this.loadFormula().then(() => {
        this.recordView = new _editFormula.default({
          model: this.model,
          targetEntityType: this.scope,
          type: this.type
        });
        this.assignView('record', this.recordView, '.record');
      }));
      this.listenTo(this.model, 'change', (m, o) => {
        if (!o.ui) {
          return;
        }
        this.setIsChanged();
      });
    }
    async loadFormula() {
      await Espo.Ajax.getRequest('Metadata/action/get', {
        key: 'formula.' + this.scope
      }).then(formulaData => {
        formulaData = formulaData || {};
        this.model.set(this.type, formulaData[this.type] || null);
        this.updateAttributes();
      });
    }
    afterRender() {
      this.$save = this.$el.find('[data-action="save"]');
    }
    disableButtons() {
      this.$save.addClass('disabled').attr('disabled', 'disabled');
    }
    enableButtons() {
      this.$save.removeClass('disabled').removeAttr('disabled');
    }
    updateAttributes() {
      this.attributes = Espo.Utils.clone(this.model.attributes);
    }
    actionSave() {
      const data = this.recordView.fetch();
      if (_underscore.default.isEqual(data, this.attributes)) {
        Espo.Ui.warning(this.translate('notModified', 'messages'));
        return;
      }
      if (this.recordView.validate()) {
        return;
      }
      this.disableButtons();
      Espo.Ui.notify(' ... ');
      Espo.Ajax.postRequest('EntityManager/action/formula', {
        data: data,
        scope: this.scope
      }).then(() => {
        Espo.Ui.success(this.translate('Saved'));
        this.enableButtons();
        this.setIsNotChanged();
        this.updateAttributes();
      }).catch(() => this.enableButtons());
    }
    actionClose() {
      this.setIsNotChanged();
      this.getRouter().navigate('#Admin/entityManager/scope=' + this.scope, {
        trigger: true
      });
    }
    async actionResetToDefault() {
      await this.confirm(this.translate('confirmation', 'messages'));
      this.disableButtons();
      Espo.Ui.notify(' ... ');
      try {
        await Espo.Ajax.postRequest('EntityManager/action/resetFormulaToDefault', {
          scope: this.scope,
          type: this.type
        });
      } catch (e) {
        this.enableButtons();
        return;
      }
      await this.loadFormula();
      await this.recordView.reRender();
      this.enableButtons();
      this.setIsNotChanged();
      Espo.Ui.success(this.translate('Done'));
    }
    setConfirmLeaveOut(value) {
      this.getRouter().confirmLeaveOut = value;
    }
    setIsChanged() {
      this.isChanged = true;
      this.setConfirmLeaveOut(true);
    }
    setIsNotChanged() {
      this.isChanged = false;
      this.setConfirmLeaveOut(false);
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Formula', 'labels', 'EntityManager'));
    }

    /**
     * @param {KeyboardEvent} e
     */
    onKeyDown(e) {
      const key = Espo.Utils.getKeyFromKeyEvent(e);
      if (key === 'Control+KeyS' || key === 'Control+Enter') {
        this.actionSave();
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }
  var _default = _exports.default = EntityManagerFormulaView;
});

define("views/admin/entity-manager/edit", ["exports", "view", "model"], function (_exports, _view, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _view = _interopRequireDefault(_view);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class EntityManagerEditView extends _view.default {
    template = 'admin/entity-manager/edit';

    /**
     * @type {{
     *     string: {
     *         fieldDefs: Object.<string, *>,
     *         location?: string,
     *     }
     * }}
     */
    additionalParams;
    defaultParamLocation = 'scopes';
    data() {
      return {
        isNew: this.isNew,
        scope: this.scope
      };
    }
    setupData() {
      const scope = this.scope;
      const templateType = this.getMetadata().get(['scopes', scope, 'type']) || null;
      this.hasStreamField = true;
      if (scope) {
        this.hasStreamField = this.getMetadata().get(['scopes', scope, 'customizable']) && this.getMetadata().get(['scopes', scope, 'object']) || false;
      }
      if (scope === 'User') {
        this.hasStreamField = false;
      }
      this.hasColorField = !this.getConfig().get('scopeColorsDisabled');
      if (scope) {
        this.additionalParams = Espo.Utils.cloneDeep({
          ...this.getMetadata().get(['app', 'entityManagerParams', 'Global']),
          ...this.getMetadata().get(['app', 'entityManagerParams', '@' + (templateType || '_')]),
          ...this.getMetadata().get(['app', 'entityManagerParams', scope])
        });
        this.model.set('name', scope);
        this.model.set('labelSingular', this.translate(scope, 'scopeNames'));
        this.model.set('labelPlural', this.translate(scope, 'scopeNamesPlural'));
        this.model.set('type', this.getMetadata().get('scopes.' + scope + '.type') || '');
        this.model.set('stream', this.getMetadata().get('scopes.' + scope + '.stream') || false);
        this.model.set('disabled', this.getMetadata().get('scopes.' + scope + '.disabled') || false);
        this.model.set('sortBy', this.getMetadata().get('entityDefs.' + scope + '.collection.orderBy'));
        this.model.set('sortDirection', this.getMetadata().get('entityDefs.' + scope + '.collection.order'));
        this.model.set('textFilterFields', this.getMetadata().get(['entityDefs', scope, 'collection', 'textFilterFields']) || ['name']);
        this.model.set('fullTextSearch', this.getMetadata().get(['entityDefs', scope, 'collection', 'fullTextSearch']) || false);
        this.model.set('countDisabled', this.getMetadata().get(['entityDefs', scope, 'collection', 'countDisabled']) || false);
        this.model.set('statusField', this.getMetadata().get('scopes.' + scope + '.statusField') || null);
        if (this.hasColorField) {
          this.model.set('color', this.getMetadata().get(['clientDefs', scope, 'color']) || null);
        }
        this.model.set('iconClass', this.getMetadata().get(['clientDefs', scope, 'iconClass']) || null);
        this.model.set('kanbanViewMode', this.getMetadata().get(['clientDefs', scope, 'kanbanViewMode']) || false);
        this.model.set('kanbanStatusIgnoreList', this.getMetadata().get(['scopes', scope, 'kanbanStatusIgnoreList']) || []);
        for (const param in this.additionalParams) {
          /** @type {{fieldDefs: Object, location?: string, param?: string}} */
          const defs = this.additionalParams[param];
          const location = defs.location || this.defaultParamLocation;
          const defaultValue = defs.fieldDefs.type === 'bool' ? false : null;
          const actualParam = defs.param || param;
          const value = this.getMetadata().get([location, scope, actualParam]) || defaultValue;
          this.model.set(param, value);
        }
      }
      if (scope) {
        const fieldDefs = this.getMetadata().get('entityDefs.' + scope + '.fields') || {};
        this.orderableFieldList = Object.keys(fieldDefs).filter(item => {
          if (!this.getFieldManager().isEntityTypeFieldAvailable(scope, item)) {
            return false;
          }
          if (fieldDefs[item].orderDisabled) {
            return false;
          }
          return true;
        }).sort((v1, v2) => {
          return this.translate(v1, 'fields', scope).localeCompare(this.translate(v2, 'fields', scope));
        });
        this.sortByTranslation = {};
        this.orderableFieldList.forEach(item => {
          this.sortByTranslation[item] = this.translate(item, 'fields', scope);
        });
        this.filtersOptionList = this.getTextFiltersOptionList(scope);
        this.textFilterFieldsTranslation = {};
        this.filtersOptionList.forEach(item => {
          if (~item.indexOf('.')) {
            const link = item.split('.')[0];
            const foreignField = item.split('.')[1];
            const foreignEntityType = this.getMetadata().get(['entityDefs', scope, 'links', link, 'entity']);
            this.textFilterFieldsTranslation[item] = this.translate(link, 'links', scope) + ' . ' + this.translate(foreignField, 'fields', foreignEntityType);
            return;
          }
          this.textFilterFieldsTranslation[item] = this.translate(item, 'fields', scope);
        });
        this.enumFieldList = Object.keys(fieldDefs).filter(item => {
          if (fieldDefs[item].disabled) {
            return;
          }
          if (fieldDefs[item].type === 'enum') {
            return true;
          }
        }).sort((v1, v2) => {
          return this.translate(v1, 'fields', scope).localeCompare(this.translate(v2, 'fields', scope));
        });
        this.translatedStatusFields = {};
        this.enumFieldList.forEach(item => {
          this.translatedStatusFields[item] = this.translate(item, 'fields', scope);
        });
        this.enumFieldList.unshift('');
        this.translatedStatusFields[''] = '-' + this.translate('None') + '-';
        this.statusOptionList = [];
        this.translatedStatusOptions = {};
      }
      this.detailLayout = [{
        rows: [[{
          name: 'name'
        }, {
          name: 'type',
          options: {
            tooltipText: this.translate('entityType', 'tooltips', 'EntityManager')
          }
        }], [{
          name: 'labelSingular'
        }, {
          name: 'labelPlural'
        }], [{
          name: 'iconClass'
        }, {
          name: 'color'
        }], [{
          name: 'disabled'
        }, {
          name: 'stream'
        }], [{
          name: 'sortBy',
          options: {
            translatedOptions: this.sortByTranslation
          }
        }, {
          name: 'sortDirection'
        }], [{
          name: 'textFilterFields',
          options: {
            translatedOptions: this.textFilterFieldsTranslation
          }
        }, {
          name: 'statusField',
          options: {
            translatedOptions: this.translatedStatusFields
          }
        }], [{
          name: 'fullTextSearch'
        }, {
          name: 'countDisabled'
        }], [{
          name: 'kanbanViewMode'
        }, {
          name: 'kanbanStatusIgnoreList',
          options: {
            translatedOptions: this.translatedStatusOptions
          }
        }]]
      }];
      if (this.scope) {
        const rows1 = [];
        const rows2 = [];
        const paramList1 = Object.keys(this.additionalParams).filter(item => !!this.getMetadata().get(['app', 'entityManagerParams', 'Global', item]));
        const paramList2 = Object.keys(this.additionalParams).filter(item => !paramList1.includes(item));
        const add = function (rows, list) {
          list.forEach((param, i) => {
            if (i % 2 === 0) {
              rows.push([]);
            }
            const row = rows[rows.length - 1];
            row.push({
              name: param
            });
            if (i === list.length - 1 && row.length === 1) {
              row.push(false);
            }
          });
        };
        add(rows1, paramList1);
        add(rows2, paramList2);
        if (rows1.length) {
          this.detailLayout.push({
            rows: rows1
          });
        }
        if (rows2.length) {
          this.detailLayout.push({
            rows: rows2
          });
        }
      }
    }
    setup() {
      const scope = this.scope = this.options.scope || false;
      this.isNew = !scope;
      this.model = new _model.default();
      this.model.name = 'EntityManager';
      if (!this.isNew) {
        this.isCustom = this.getMetadata().get(['scopes', scope, 'isCustom']);
      }
      if (this.scope && (!this.getMetadata().get(`scopes.${scope}.customizable`) || this.getMetadata().get(`scopes.${scope}.entityManager.edit`) === false)) {
        throw new Espo.Exceptions.NotFound("The entity type is not customizable.");
      }
      this.setupData();
      this.setupDefs();
      this.model.fetchedAttributes = this.model.getClonedAttributes();
      this.createRecordView();
    }
    setupDefs() {
      const scope = this.scope;
      const defs = {
        fields: {
          type: {
            type: 'enum',
            required: true,
            options: this.getMetadata().get('app.entityTemplateList') || ['Base'],
            readOnly: scope !== false,
            tooltip: true
          },
          stream: {
            type: 'bool',
            required: true,
            tooltip: true
          },
          disabled: {
            type: 'bool',
            tooltip: true
          },
          name: {
            type: 'varchar',
            required: true,
            trim: true,
            maxLength: 64,
            readOnly: scope !== false
          },
          labelSingular: {
            type: 'varchar',
            required: true,
            trim: true
          },
          labelPlural: {
            type: 'varchar',
            required: true,
            trim: true
          },
          color: {
            type: 'varchar',
            view: 'views/fields/colorpicker'
          },
          iconClass: {
            type: 'varchar',
            view: 'views/admin/entity-manager/fields/icon-class'
          },
          sortBy: {
            type: 'enum',
            options: this.orderableFieldList
          },
          sortDirection: {
            type: 'enum',
            options: ['asc', 'desc']
          },
          fullTextSearch: {
            type: 'bool',
            tooltip: true
          },
          countDisabled: {
            type: 'bool',
            tooltip: true
          },
          kanbanViewMode: {
            type: 'bool'
          },
          textFilterFields: {
            type: 'multiEnum',
            options: this.filtersOptionList,
            tooltip: true
          },
          statusField: {
            type: 'enum',
            options: this.enumFieldList,
            tooltip: true
          },
          kanbanStatusIgnoreList: {
            type: 'multiEnum',
            options: this.statusOptionList
          }
        }
      };
      if (this.getMetadata().get(['scopes', this.scope, 'statusFieldLocked'])) {
        defs.fields.statusField.readOnly = true;
      }
      for (const param in this.additionalParams) {
        defs.fields[param] = this.additionalParams[param].fieldDefs;
      }
      this.model.setDefs(defs);
    }
    createRecordView() {
      return this.createView('record', 'views/admin/entity-manager/record/edit', {
        selector: '.record',
        model: this.model,
        detailLayout: this.detailLayout,
        isNew: this.isNew,
        hasColorField: this.hasColorField,
        hasStreamField: this.hasStreamField,
        isCustom: this.isCustom,
        subjectEntityType: this.scope,
        shortcutKeysEnabled: true
      }).then(view => {
        this.listenTo(view, 'save', () => this.actionSave());
        this.listenTo(view, 'cancel', () => this.actionCancel());
        this.listenTo(view, 'reset-to-default', () => this.actionResetToDefault());
      });
    }
    hideField(name) {
      this.getRecordView().hideField(name);
    }
    showField(name) {
      this.getRecordView().showField(name);
    }
    toPlural(string) {
      if (string.slice(-1) === 'y') {
        return string.substr(0, string.length - 1) + 'ies';
      }
      if (string.slice(-1) === 's') {
        return string + 'es';
      }
      return string + 's';
    }
    afterRender() {
      this.getFieldView('name').on('change', () => {
        let name = this.model.get('name');
        name = name.charAt(0).toUpperCase() + name.slice(1);
        this.model.set('labelSingular', name);
        this.model.set('labelPlural', this.toPlural(name));
        if (name) {
          name = name.replace(/-/g, ' ').replace(/_/g, ' ').replace(/[^\w\s]/gi, '').replace(/ (.)/g, (match, g) => {
            return g.toUpperCase();
          }).replace(' ', '');
          if (name.length) {
            name = name.charAt(0).toUpperCase() + name.slice(1);
          }
        }
        this.model.set('name', name);
      });
    }
    actionSave() {
      let fieldList = ['name', 'type', 'labelSingular', 'labelPlural', 'disabled', 'statusField', 'iconClass'];
      if (this.hasStreamField) {
        fieldList.push('stream');
      }
      if (this.scope) {
        fieldList.push('sortBy');
        fieldList.push('sortDirection');
        fieldList.push('kanbanViewMode');
        fieldList.push('kanbanStatusIgnoreList');
        fieldList = fieldList.concat(Object.keys(this.additionalParams));
      }
      if (this.hasColorField) {
        fieldList.push('color');
      }
      const fetchedAttributes = Espo.Utils.cloneDeep(this.model.fetchedAttributes) || {};
      let notValid = false;
      fieldList.forEach(item => {
        if (!this.getFieldView(item)) {
          return;
        }
        if (this.getFieldView(item).mode !== 'edit') {
          return;
        }
        this.getFieldView(item).fetchToModel();
      });
      fieldList.forEach(item => {
        if (!this.getFieldView(item)) {
          return;
        }
        if (this.getFieldView(item).mode !== 'edit') {
          return;
        }
        notValid = this.getFieldView(item).validate() || notValid;
      });
      if (notValid) {
        return;
      }
      this.disableButtons();
      let url = 'EntityManager/action/createEntity';
      if (this.scope) {
        url = 'EntityManager/action/updateEntity';
      }
      const name = this.model.get('name');
      const data = {
        name: name,
        labelSingular: this.model.get('labelSingular'),
        labelPlural: this.model.get('labelPlural'),
        type: this.model.get('type'),
        stream: this.model.get('stream'),
        disabled: this.model.get('disabled'),
        textFilterFields: this.model.get('textFilterFields'),
        fullTextSearch: this.model.get('fullTextSearch'),
        countDisabled: this.model.get('countDisabled'),
        statusField: this.model.get('statusField'),
        iconClass: this.model.get('iconClass')
      };
      if (this.hasColorField) {
        data.color = this.model.get('color') || null;
      }
      if (data.statusField === '') {
        data.statusField = null;
      }
      if (this.scope) {
        data.sortBy = this.model.get('sortBy');
        data.sortDirection = this.model.get('sortDirection');
        data.kanbanViewMode = this.model.get('kanbanViewMode');
        data.kanbanStatusIgnoreList = this.model.get('kanbanStatusIgnoreList');
        for (const param in this.additionalParams) {
          const type = this.additionalParams[param].fieldDefs.type;
          this.getFieldManager().getAttributeList(type, param).forEach(attribute => {
            data[attribute] = this.model.get(attribute);
          });
        }
      }
      if (!this.isNew) {
        if (this.model.fetchedAttributes.labelPlural === data.labelPlural) {
          delete data.labelPlural;
        }
        if (this.model.fetchedAttributes.labelSingular === data.labelSingular) {
          delete data.labelSingular;
        }
      }
      Espo.Ui.notify(this.translate('pleaseWait', 'messages'));
      Espo.Ajax.postRequest(url, data).then(/** Record */response => {
        this.model.fetchedAttributes = this.model.getClonedAttributes();
        this.scope ? Espo.Ui.success(this.translate('Saved')) : Espo.Ui.success(this.translate('entityCreated', 'messages', 'EntityManager'));
        this.getMetadata().loadSkipCache().then(() => Promise.all([this.getConfig().load(), this.getLanguage().loadSkipCache()])).then(() => {
          const rebuildRequired = data.fullTextSearch && !fetchedAttributes.fullTextSearch;
          this.broadcastUpdate();
          if (rebuildRequired) {
            this.createView('dialog', 'views/modal', {
              templateContent: "{{complexText viewObject.options.msg}}" + "{{complexText viewObject.options.msgRebuild}}",
              headerText: this.translate('rebuildRequired', 'strings', 'Admin'),
              backdrop: 'static',
              msg: this.translate('rebuildRequired', 'messages', 'Admin'),
              msgRebuild: '```php rebuild.php```',
              buttonList: [{
                name: 'close',
                label: this.translate('Close')
              }]
            }).then(view => view.render());
          }
          this.enableButtons();
          this.getRecordView().setIsNotChanged();
          if (this.isNew) {
            this.getRouter().navigate(`#Admin/entityManager/scope=${response.name}`, {
              trigger: true
            });
          }
        });
      }).catch(() => {
        this.enableButtons();
      });
    }
    actionCancel() {
      this.getRecordView().setConfirmLeaveOut(false);
      if (!this.isNew) {
        this.getRouter().navigate('#Admin/entityManager/scope=' + this.scope, {
          trigger: true
        });
        return;
      }
      this.getRouter().navigate('#Admin/entityManager', {
        trigger: true
      });
    }
    actionResetToDefault() {
      this.confirm(this.translate('confirmation', 'messages'), () => {
        Espo.Ui.notify(this.translate('pleaseWait', 'messages'));
        this.disableButtons();
        Espo.Ajax.postRequest('EntityManager/action/resetToDefault', {
          scope: this.scope
        }).then(() => {
          this.getMetadata().loadSkipCache().then(() => this.getLanguage().loadSkipCache()).then(() => {
            this.setupData();
            this.model.fetchedAttributes = this.model.getClonedAttributes();
            Espo.Ui.success(this.translate('Done'));
            this.enableButtons();
            this.broadcastUpdate();
            this.getRecordView().setIsNotChanged();
          });
        });
      });
    }

    /**
     * @return {module:views/record/edit}
     */
    getRecordView() {
      return this.getView('record');
    }
    getTextFiltersOptionList(scope) {
      const fieldDefs = this.getMetadata().get(['entityDefs', scope, 'fields']) || {};
      const filtersOptionList = Object.keys(fieldDefs).filter(item => {
        const fieldType = fieldDefs[item].type;
        if (!this.getMetadata().get(['fields', fieldType, 'textFilter'])) {
          return false;
        }
        if (!this.getFieldManager().isEntityTypeFieldAvailable(scope, item)) {
          return false;
        }
        if (this.getMetadata().get(['entityDefs', scope, 'fields', item, 'textFilterDisabled'])) {
          return false;
        }
        return true;
      });
      filtersOptionList.unshift('id');
      const linkList = Object.keys(this.getMetadata().get(['entityDefs', scope, 'links']) || {});
      linkList.sort((v1, v2) => {
        return this.translate(v1, 'links', scope).localeCompare(this.translate(v2, 'links', scope));
      });
      linkList.forEach(link => {
        const linkType = this.getMetadata().get(['entityDefs', scope, 'links', link, 'type']);
        if (linkType !== 'belongsTo') {
          return;
        }
        const foreignEntityType = this.getMetadata().get(['entityDefs', scope, 'links', link, 'entity']);
        if (!foreignEntityType) {
          return;
        }
        if (foreignEntityType === 'Attachment') {
          return;
        }
        const fields = this.getMetadata().get(['entityDefs', foreignEntityType, 'fields']) || {};
        const fieldList = Object.keys(fields);
        fieldList.sort((v1, v2) => {
          return this.translate(v1, 'fields', foreignEntityType).localeCompare(this.translate(v2, 'fields', foreignEntityType));
        });
        fieldList.filter(item => {
          const fieldType = this.getMetadata().get(['entityDefs', foreignEntityType, 'fields', item, 'type']);
          if (!this.getMetadata().get(['fields', fieldType, 'textFilter'])) {
            return false;
          }
          if (!this.getMetadata().get(['fields', fieldType, 'textFilterForeign'])) {
            return false;
          }
          if (!this.getFieldManager().isEntityTypeFieldAvailable(foreignEntityType, item)) {
            return false;
          }
          if (this.getMetadata().get(['entityDefs', foreignEntityType, 'fields', item, 'textFilterDisabled'])) {
            return false;
          }
          if (this.getMetadata().get(['entityDefs', foreignEntityType, 'fields', item, 'foreignAccessDisabled'])) {
            return false;
          }
          return true;
        }).forEach(item => {
          filtersOptionList.push(`${link}.${item}`);
        });
      });
      return filtersOptionList;
    }
    getFieldView(name) {
      return this.getRecordView().getFieldView(name);
    }
    disableButtons() {
      this.getRecordView().disableActionItems();
    }
    enableButtons() {
      this.getRecordView().enableActionItems();
    }
    broadcastUpdate() {
      this.getHelper().broadcastChannel.postMessage('update:metadata');
      this.getHelper().broadcastChannel.postMessage('update:language');
      this.getHelper().broadcastChannel.postMessage('update:config');
    }
  }
  var _default = _exports.default = EntityManagerEditView;
});

define("views/admin/entity-manager/record/edit", ["exports", "views/record/edit"], function (_exports, _edit) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _edit = _interopRequireDefault(_edit);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class EntityManagerEditRecordView extends _edit.default {
    bottomView = null;
    sideView = null;
    dropdownItemList = [];
    accessControlDisabled = true;
    saveAndContinueEditingAction = false;
    saveAndNewAction = false;
    shortcutKeys = {
      'Control+Enter': 'save',
      'Control+KeyS': 'save'
    };
    setup() {
      this.isCreate = this.options.isNew;
      this.scope = 'EntityManager';
      this.subjectEntityType = this.options.subjectEntityType;
      if (!this.isCreate) {
        this.buttonList = [{
          name: 'save',
          style: 'danger',
          label: 'Save',
          onClick: () => this.actionSave()
        }, {
          name: 'cancel',
          label: 'Cancel'
        }];
      } else {
        this.buttonList = [{
          name: 'save',
          style: 'danger',
          label: 'Create',
          onClick: () => this.actionSave()
        }, {
          name: 'cancel',
          label: 'Cancel'
        }];
      }
      if (!this.isCreate && !this.options.isCustom) {
        this.buttonList.push({
          name: 'resetToDefault',
          text: this.translate('Reset to Default', 'labels', 'Admin'),
          onClick: () => this.actionResetToDefault()
        });
      }
      super.setup();
      if (this.isCreate) {
        this.hideField('sortBy');
        this.hideField('sortDirection');
        this.hideField('textFilterFields');
        this.hideField('statusField');
        this.hideField('fullTextSearch');
        this.hideField('countDisabled');
        this.hideField('kanbanViewMode');
        this.hideField('kanbanStatusIgnoreList');
        this.hideField('disabled');
      }
      if (!this.options.hasColorField) {
        this.hideField('color');
      }
      if (!this.options.hasStreamField) {
        this.hideField('stream');
      }
      if (!this.isCreate) {
        this.manageKanbanFields({});
        this.listenTo(this.model, 'change:statusField', (m, v, o) => {
          this.manageKanbanFields(o);
        });
        this.manageKanbanViewModeField();
        this.listenTo(this.model, 'change:kanbanViewMode', () => {
          this.manageKanbanViewModeField();
        });
      }
    }
    actionSave(data) {
      this.trigger('save');
    }
    actionCancel() {
      this.trigger('cancel');
    }
    actionResetToDefault() {
      this.trigger('reset-to-default');
    }
    manageKanbanViewModeField() {
      if (this.model.get('kanbanViewMode')) {
        this.showField('kanbanStatusIgnoreList');
      } else {
        this.hideField('kanbanStatusIgnoreList');
      }
    }
    manageKanbanFields(o) {
      if (o.ui) {
        this.model.set('kanbanStatusIgnoreList', []);
      }
      if (this.model.get('statusField')) {
        this.setKanbanStatusIgnoreListOptions();
        this.showField('kanbanViewMode');
        if (this.model.get('kanbanViewMode')) {
          this.showField('kanbanStatusIgnoreList');
        } else {
          this.hideField('kanbanStatusIgnoreList');
        }
      } else {
        this.hideField('kanbanViewMode');
        this.hideField('kanbanStatusIgnoreList');
      }
    }
    setKanbanStatusIgnoreListOptions() {
      const statusField = this.model.get('statusField');
      const optionList = this.getMetadata().get(['entityDefs', this.subjectEntityType, 'fields', statusField, 'options']) || [];
      this.setFieldOptionList('kanbanStatusIgnoreList', optionList);
      const fieldView = this.getFieldView('kanbanStatusIgnoreList');
      if (!fieldView) {
        this.once('after:render', () => this.setKanbanStatusIgnoreListTranslation());
        return;
      }
      this.setKanbanStatusIgnoreListTranslation();
    }
    setKanbanStatusIgnoreListTranslation() {
      /** @type {import('views/fields/multi-enum').default} */
      const fieldView = this.getFieldView('kanbanStatusIgnoreList');
      const statusField = this.model.get('statusField');
      fieldView.params.translation = this.getMetadata().get(['entityDefs', this.subjectEntityType, 'fields', statusField, 'translation']) || `${this.subjectEntityType}.options.${statusField}`;
      fieldView.setupTranslation();
    }
  }
  _exports.default = EntityManagerEditRecordView;
});

define("views/admin/entity-manager/modals/select-icon", ["exports", "views/modal"], function (_exports, _modal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _modal.default {
    template = 'admin/entity-manager/modals/select-icon';
    buttonList = [{
      name: 'cancel',
      label: 'Cancel'
    }];
    data() {
      return {
        iconDataList: this.getIconDataList()
      };
    }
    setup() {
      this.addHandler('keyup', 'input[data-name="quick-search"]', (e, /** HTMLInputElement */target) => {
        this.processQuickSearch(target.value);
      });
      this.itemCache = {};
      this.iconList = ["fas fa-0", "fas fa-1", "fas fa-2", "fas fa-3", "fas fa-4", "fas fa-5", "fas fa-6", "fas fa-7", "fas fa-8", "fas fa-9", "fas fa-a", "fas fa-address-book", "fas fa-address-card", "fas fa-align-center", "fas fa-align-justify", "fas fa-align-left", "fas fa-align-right", "fas fa-anchor", "fas fa-anchor-circle-check", "fas fa-anchor-circle-exclamation", "fas fa-anchor-circle-xmark", "fas fa-anchor-lock", "fas fa-angle-down", "fas fa-angle-left", "fas fa-angle-right", "fas fa-angle-up", "fas fa-angles-down", "fas fa-angles-left", "fas fa-angles-right", "fas fa-angles-up", "fas fa-ankh", "fas fa-apple-whole", "fas fa-archway", "fas fa-arrow-down", "fas fa-arrow-down-1-9", "fas fa-arrow-down-9-1", "fas fa-arrow-down-a-z", "fas fa-arrow-down-long", "fas fa-arrow-down-short-wide", "fas fa-arrow-down-up-across-line", "fas fa-arrow-down-up-lock", "fas fa-arrow-down-wide-short", "fas fa-arrow-down-z-a", "fas fa-arrow-left", "fas fa-arrow-left-long", "fas fa-arrow-pointer", "fas fa-arrow-right", "fas fa-arrow-right-arrow-left", "fas fa-arrow-right-from-bracket", "fas fa-arrow-right-long", "fas fa-arrow-right-to-bracket", "fas fa-arrow-right-to-city", "fas fa-arrow-rotate-left", "fas fa-arrow-rotate-right", "fas fa-arrow-trend-down", "fas fa-arrow-trend-up", "fas fa-arrow-turn-down", "fas fa-arrow-turn-up", "fas fa-arrow-up", "fas fa-arrow-up-1-9", "fas fa-arrow-up-9-1", "fas fa-arrow-up-a-z", "fas fa-arrow-up-from-bracket", "fas fa-arrow-up-from-ground-water", "fas fa-arrow-up-from-water-pump", "fas fa-arrow-up-long", "fas fa-arrow-up-right-dots", "fas fa-arrow-up-right-from-square", "fas fa-arrow-up-short-wide", "fas fa-arrow-up-wide-short", "fas fa-arrow-up-z-a", "fas fa-arrows-down-to-line", "fas fa-arrows-down-to-people", "fas fa-arrows-left-right", "fas fa-arrows-left-right-to-line", "fas fa-arrows-rotate", "fas fa-arrows-spin", "fas fa-arrows-split-up-and-left", "fas fa-arrows-to-circle", "fas fa-arrows-to-dot", "fas fa-arrows-to-eye", "fas fa-arrows-turn-right", "fas fa-arrows-turn-to-dots", "fas fa-arrows-up-down", "fas fa-arrows-up-down-left-right", "fas fa-arrows-up-to-line", "fas fa-asterisk", "fas fa-at", "fas fa-atom", "fas fa-audio-description", "fas fa-austral-sign", "fas fa-award", "fas fa-b", "fas fa-baby", "fas fa-baby-carriage", "fas fa-backward", "fas fa-backward-fast", "fas fa-backward-step", "fas fa-bacon", "fas fa-bacteria", "fas fa-bacterium", "fas fa-bag-shopping", "fas fa-bahai", "fas fa-baht-sign", "fas fa-ban", "fas fa-ban-smoking", "fas fa-bandage", "fas fa-bangladeshi-taka-sign", "fas fa-barcode", "fas fa-bars", "fas fa-bars-progress", "fas fa-bars-staggered", "fas fa-baseball", "fas fa-baseball-bat-ball", "fas fa-basket-shopping", "fas fa-basketball", "fas fa-bath", "fas fa-battery-empty", "fas fa-battery-full", "fas fa-battery-half", "fas fa-battery-quarter", "fas fa-battery-three-quarters", "fas fa-bed", "fas fa-bed-pulse", "fas fa-beer-mug-empty", "fas fa-bell", "fas fa-bell-concierge", "fas fa-bell-slash", "fas fa-bezier-curve", "fas fa-bicycle", "fas fa-binoculars", "fas fa-biohazard", "fas fa-bitcoin-sign", "fas fa-blender", "fas fa-blender-phone", "fas fa-blog", "fas fa-bold", "fas fa-bolt", "fas fa-bolt-lightning", "fas fa-bomb", "fas fa-bone", "fas fa-bong", "fas fa-book", "fas fa-book-atlas", "fas fa-book-bible", "fas fa-book-bookmark", "fas fa-book-journal-whills", "fas fa-book-medical", "fas fa-book-open", "fas fa-book-open-reader", "fas fa-book-quran", "fas fa-book-skull", "fas fa-book-tanakh", "fas fa-bookmark", "fas fa-border-all", "fas fa-border-none", "fas fa-border-top-left", "fas fa-bore-hole", "fas fa-bottle-droplet", "fas fa-bottle-water", "fas fa-bowl-food", "fas fa-bowl-rice", "fas fa-bowling-ball", "fas fa-box", "fas fa-box-archive", "fas fa-box-open", "fas fa-box-tissue", "fas fa-boxes-packing", "fas fa-boxes-stacked", "fas fa-braille", "fas fa-brain", "fas fa-brazilian-real-sign", "fas fa-bread-slice", "fas fa-bridge", "fas fa-bridge-circle-check", "fas fa-bridge-circle-exclamation", "fas fa-bridge-circle-xmark", "fas fa-bridge-lock", "fas fa-bridge-water", "fas fa-briefcase", "fas fa-briefcase-medical", "fas fa-broom", "fas fa-broom-ball", "fas fa-brush", "fas fa-bucket", "fas fa-bug", "fas fa-bug-slash", "fas fa-bugs", "fas fa-building", "fas fa-building-circle-arrow-right", "fas fa-building-circle-check", "fas fa-building-circle-exclamation", "fas fa-building-circle-xmark", "fas fa-building-columns", "fas fa-building-flag", "fas fa-building-lock", "fas fa-building-ngo", "fas fa-building-shield", "fas fa-building-un", "fas fa-building-user", "fas fa-building-wheat", "fas fa-bullhorn", "fas fa-bullseye", "fas fa-burger", "fas fa-burst", "fas fa-bus", "fas fa-bus-simple", "fas fa-business-time", "fas fa-c", "fas fa-cable-car", "fas fa-cake-candles", "fas fa-calculator", "fas fa-calendar", "fas fa-calendar-check", "fas fa-calendar-day", "fas fa-calendar-days", "fas fa-calendar-minus", "fas fa-calendar-plus", "fas fa-calendar-week", "fas fa-calendar-xmark", "fas fa-camera", "fas fa-camera-retro", "fas fa-camera-rotate", "fas fa-campground", "fas fa-candy-cane", "fas fa-cannabis", "fas fa-capsules", "fas fa-car", "fas fa-car-battery", "fas fa-car-burst", "fas fa-car-on", "fas fa-car-rear", "fas fa-car-side", "fas fa-car-tunnel", "fas fa-caravan", "fas fa-caret-down", "fas fa-caret-left", "fas fa-caret-right", "fas fa-caret-up", "fas fa-carrot", "fas fa-cart-arrow-down", "fas fa-cart-flatbed", "fas fa-cart-flatbed-suitcase", "fas fa-cart-plus", "fas fa-cart-shopping", "fas fa-cash-register", "fas fa-cat", "fas fa-cedi-sign", "fas fa-cent-sign", "fas fa-certificate", "fas fa-chair", "fas fa-chalkboard", "fas fa-chalkboard-user", "fas fa-champagne-glasses", "fas fa-charging-station", "fas fa-chart-area", "fas fa-chart-bar", "fas fa-chart-column", "fas fa-chart-gantt", "fas fa-chart-line", "fas fa-chart-pie", "fas fa-chart-simple", "fas fa-check", "fas fa-check-double", "fas fa-check-to-slot", "fas fa-cheese", "fas fa-chess", "fas fa-chess-bishop", "fas fa-chess-board", "fas fa-chess-king", "fas fa-chess-knight", "fas fa-chess-pawn", "fas fa-chess-queen", "fas fa-chess-rook", "fas fa-chevron-down", "fas fa-chevron-left", "fas fa-chevron-right", "fas fa-chevron-up", "fas fa-child", "fas fa-child-combatant", "fas fa-child-dress", "fas fa-child-reaching", "fas fa-children", "fas fa-church", "fas fa-circle", "fas fa-circle-arrow-down", "fas fa-circle-arrow-left", "fas fa-circle-arrow-right", "fas fa-circle-arrow-up", "fas fa-circle-check", "fas fa-circle-chevron-down", "fas fa-circle-chevron-left", "fas fa-circle-chevron-right", "fas fa-circle-chevron-up", "fas fa-circle-dollar-to-slot", "fas fa-circle-dot", "fas fa-circle-down", "fas fa-circle-exclamation", "fas fa-circle-h", "fas fa-circle-half-stroke", "fas fa-circle-info", "fas fa-circle-left", "fas fa-circle-minus", "fas fa-circle-nodes", "fas fa-circle-notch", "fas fa-circle-pause", "fas fa-circle-play", "fas fa-circle-plus", "fas fa-circle-question", "fas fa-circle-radiation", "fas fa-circle-right", "fas fa-circle-stop", "fas fa-circle-up", "fas fa-circle-user", "fas fa-circle-xmark", "fas fa-city", "fas fa-clapperboard", "fas fa-clipboard", "fas fa-clipboard-check", "fas fa-clipboard-list", "fas fa-clipboard-question", "fas fa-clipboard-user", "fas fa-clock", "fas fa-clock-rotate-left", "fas fa-clone", "fas fa-closed-captioning", "fas fa-cloud", "fas fa-cloud-arrow-down", "fas fa-cloud-arrow-up", "fas fa-cloud-bolt", "fas fa-cloud-meatball", "fas fa-cloud-moon", "fas fa-cloud-moon-rain", "fas fa-cloud-rain", "fas fa-cloud-showers-heavy", "fas fa-cloud-showers-water", "fas fa-cloud-sun", "fas fa-cloud-sun-rain", "fas fa-clover", "fas fa-code", "fas fa-code-branch", "fas fa-code-commit", "fas fa-code-compare", "fas fa-code-fork", "fas fa-code-merge", "fas fa-code-pull-request", "fas fa-coins", "fas fa-colon-sign", "fas fa-comment", "fas fa-comment-dollar", "fas fa-comment-dots", "fas fa-comment-medical", "fas fa-comment-slash", "fas fa-comment-sms", "fas fa-comments", "fas fa-comments-dollar", "fas fa-compact-disc", "fas fa-compass", "fas fa-compass-drafting", "fas fa-compress", "fas fa-computer", "fas fa-computer-mouse", "fas fa-cookie", "fas fa-cookie-bite", "fas fa-copy", "fas fa-copyright", "fas fa-couch", "fas fa-cow", "fas fa-credit-card", "fas fa-crop", "fas fa-crop-simple", "fas fa-cross", "fas fa-crosshairs", "fas fa-crow", "fas fa-crown", "fas fa-crutch", "fas fa-cruzeiro-sign", "fas fa-cube", "fas fa-cubes", "fas fa-cubes-stacked", "fas fa-d", "fas fa-database", "fas fa-delete-left", "fas fa-democrat", "fas fa-desktop", "fas fa-dharmachakra", "fas fa-diagram-next", "fas fa-diagram-predecessor", "fas fa-diagram-project", "fas fa-diagram-successor", "fas fa-diamond", "fas fa-diamond-turn-right", "fas fa-dice", "fas fa-dice-d20", "fas fa-dice-d6", "fas fa-dice-five", "fas fa-dice-four", "fas fa-dice-one", "fas fa-dice-six", "fas fa-dice-three", "fas fa-dice-two", "fas fa-disease", "fas fa-display", "fas fa-divide", "fas fa-dna", "fas fa-dog", "fas fa-dollar-sign", "fas fa-dolly", "fas fa-dong-sign", "fas fa-door-closed", "fas fa-door-open", "fas fa-dove", "fas fa-down-left-and-up-right-to-center", "fas fa-down-long", "fas fa-download", "fas fa-dragon", "fas fa-draw-polygon", "fas fa-droplet", "fas fa-droplet-slash", "fas fa-drum", "fas fa-drum-steelpan", "fas fa-drumstick-bite", "fas fa-dumbbell", "fas fa-dumpster", "fas fa-dumpster-fire", "fas fa-dungeon", "fas fa-e", "fas fa-ear-deaf", "fas fa-ear-listen", "fas fa-earth-africa", "fas fa-earth-americas", "fas fa-earth-asia", "fas fa-earth-europe", "fas fa-earth-oceania", "fas fa-egg", "fas fa-eject", "fas fa-elevator", "fas fa-ellipsis", "fas fa-ellipsis-vertical", "fas fa-envelope", "fas fa-envelope-circle-check", "fas fa-envelope-open", "fas fa-envelope-open-text", "fas fa-envelopes-bulk", "fas fa-equals", "fas fa-eraser", "fas fa-ethernet", "fas fa-euro-sign", "fas fa-exclamation", "fas fa-expand", "fas fa-explosion", "fas fa-eye", "fas fa-eye-dropper", "fas fa-eye-low-vision", "fas fa-eye-slash", "fas fa-f", "fas fa-face-angry", "fas fa-face-dizzy", "fas fa-face-flushed", "fas fa-face-frown", "fas fa-face-frown-open", "fas fa-face-grimace", "fas fa-face-grin", "fas fa-face-grin-beam", "fas fa-face-grin-beam-sweat", "fas fa-face-grin-hearts", "fas fa-face-grin-squint", "fas fa-face-grin-squint-tears", "fas fa-face-grin-stars", "fas fa-face-grin-tears", "fas fa-face-grin-tongue", "fas fa-face-grin-tongue-squint", "fas fa-face-grin-tongue-wink", "fas fa-face-grin-wide", "fas fa-face-grin-wink", "fas fa-face-kiss", "fas fa-face-kiss-beam", "fas fa-face-kiss-wink-heart", "fas fa-face-laugh", "fas fa-face-laugh-beam", "fas fa-face-laugh-squint", "fas fa-face-laugh-wink", "fas fa-face-meh", "fas fa-face-meh-blank", "fas fa-face-rolling-eyes", "fas fa-face-sad-cry", "fas fa-face-sad-tear", "fas fa-face-smile", "fas fa-face-smile-beam", "fas fa-face-smile-wink", "fas fa-face-surprise", "fas fa-face-tired", "fas fa-fan", "fas fa-faucet", "fas fa-faucet-drip", "fas fa-fax", "fas fa-feather", "fas fa-feather-pointed", "fas fa-ferry", "fas fa-file", "fas fa-file-arrow-down", "fas fa-file-arrow-up", "fas fa-file-audio", "fas fa-file-circle-check", "fas fa-file-circle-exclamation", "fas fa-file-circle-minus", "fas fa-file-circle-plus", "fas fa-file-circle-question", "fas fa-file-circle-xmark", "fas fa-file-code", "fas fa-file-contract", "fas fa-file-csv", "fas fa-file-excel", "fas fa-file-export", "fas fa-file-image", "fas fa-file-import", "fas fa-file-invoice", "fas fa-file-invoice-dollar", "fas fa-file-lines", "fas fa-file-medical", "fas fa-file-pdf", "fas fa-file-pen", "fas fa-file-powerpoint", "fas fa-file-prescription", "fas fa-file-shield", "fas fa-file-signature", "fas fa-file-video", "fas fa-file-waveform", "fas fa-file-word", "fas fa-file-zipper", "fas fa-fill", "fas fa-fill-drip", "fas fa-film", "fas fa-filter", "fas fa-filter-circle-dollar", "fas fa-filter-circle-xmark", "fas fa-fingerprint", "fas fa-fire", "fas fa-fire-burner", "fas fa-fire-extinguisher", "fas fa-fire-flame-curved", "fas fa-fire-flame-simple", "fas fa-fish", "fas fa-fish-fins", "fas fa-flag", "fas fa-flag-checkered", "fas fa-flag-usa", "fas fa-flask", "fas fa-flask-vial", "fas fa-floppy-disk", "fas fa-florin-sign", "fas fa-folder", "fas fa-folder-closed", "fas fa-folder-minus", "fas fa-folder-open", "fas fa-folder-plus", "fas fa-folder-tree", "fas fa-font", "fas fa-font-awesome", "fas fa-football", "fas fa-forward", "fas fa-forward-fast", "fas fa-forward-step", "fas fa-franc-sign", "fas fa-frog", "fas fa-futbol", "fas fa-g", "fas fa-gamepad", "fas fa-gas-pump", "fas fa-gauge", "fas fa-gauge-high", "fas fa-gauge-simple", "fas fa-gauge-simple-high", "fas fa-gavel", "fas fa-gear", "fas fa-gears", "fas fa-gem", "fas fa-genderless", "fas fa-ghost", "fas fa-gift", "fas fa-gifts", "fas fa-glass-water", "fas fa-glass-water-droplet", "fas fa-glasses", "fas fa-globe", "fas fa-golf-ball-tee", "fas fa-gopuram", "fas fa-graduation-cap", "fas fa-greater-than", "fas fa-greater-than-equal", "fas fa-grip", "fas fa-grip-lines", "fas fa-grip-lines-vertical", "fas fa-grip-vertical", "fas fa-group-arrows-rotate", "fas fa-guarani-sign", "fas fa-guitar", "fas fa-gun", "fas fa-h", "fas fa-hammer", "fas fa-hamsa", "fas fa-hand", "fas fa-hand-back-fist", "fas fa-hand-dots", "fas fa-hand-fist", "fas fa-hand-holding", "fas fa-hand-holding-dollar", "fas fa-hand-holding-droplet", "fas fa-hand-holding-hand", "fas fa-hand-holding-heart", "fas fa-hand-holding-medical", "fas fa-hand-lizard", "fas fa-hand-middle-finger", "fas fa-hand-peace", "fas fa-hand-point-down", "fas fa-hand-point-left", "fas fa-hand-point-right", "fas fa-hand-point-up", "fas fa-hand-pointer", "fas fa-hand-scissors", "fas fa-hand-sparkles", "fas fa-hand-spock", "fas fa-handcuffs", "fas fa-hands", "fas fa-hands-asl-interpreting", "fas fa-hands-bound", "fas fa-hands-bubbles", "fas fa-hands-clapping", "fas fa-hands-holding", "fas fa-hands-holding-child", "fas fa-hands-holding-circle", "fas fa-hands-praying", "fas fa-handshake", "fas fa-handshake-angle", "fas fa-handshake-simple", "fas fa-handshake-simple-slash", "fas fa-handshake-slash", "fas fa-hanukiah", "fas fa-hard-drive", "fas fa-hashtag", "fas fa-hat-cowboy", "fas fa-hat-cowboy-side", "fas fa-hat-wizard", "fas fa-head-side-cough", "fas fa-head-side-cough-slash", "fas fa-head-side-mask", "fas fa-head-side-virus", "fas fa-heading", "fas fa-headphones", "fas fa-headphones-simple", "fas fa-headset", "fas fa-heart", "fas fa-heart-circle-bolt", "fas fa-heart-circle-check", "fas fa-heart-circle-exclamation", "fas fa-heart-circle-minus", "fas fa-heart-circle-plus", "fas fa-heart-circle-xmark", "fas fa-heart-crack", "fas fa-heart-pulse", "fas fa-helicopter", "fas fa-helicopter-symbol", "fas fa-helmet-safety", "fas fa-helmet-un", "fas fa-highlighter", "fas fa-hill-avalanche", "fas fa-hill-rockslide", "fas fa-hippo", "fas fa-hockey-puck", "fas fa-holly-berry", "fas fa-horse", "fas fa-horse-head", "fas fa-hospital", "fas fa-hospital-user", "fas fa-hot-tub-person", "fas fa-hotdog", "fas fa-hotel", "fas fa-hourglass", "fas fa-hourglass-end", "fas fa-hourglass-half", "fas fa-hourglass-start", "fas fa-house", "fas fa-house-chimney", "fas fa-house-chimney-crack", "fas fa-house-chimney-medical", "fas fa-house-chimney-user", "fas fa-house-chimney-window", "fas fa-house-circle-check", "fas fa-house-circle-exclamation", "fas fa-house-circle-xmark", "fas fa-house-crack", "fas fa-house-fire", "fas fa-house-flag", "fas fa-house-flood-water", "fas fa-house-flood-water-circle-arrow-right", "fas fa-house-laptop", "fas fa-house-lock", "fas fa-house-medical", "fas fa-house-medical-circle-check", "fas fa-house-medical-circle-exclamation", "fas fa-house-medical-circle-xmark", "fas fa-house-medical-flag", "fas fa-house-signal", "fas fa-house-tsunami", "fas fa-house-user", "fas fa-hryvnia-sign", "fas fa-hurricane", "fas fa-i", "fas fa-i-cursor", "fas fa-ice-cream", "fas fa-icicles", "fas fa-icons", "fas fa-id-badge", "fas fa-id-card", "fas fa-id-card-clip", "fas fa-igloo", "fas fa-image", "fas fa-image-portrait", "fas fa-images", "fas fa-inbox", "fas fa-indent", "fas fa-indian-rupee-sign", "fas fa-industry", "fas fa-infinity", "fas fa-info", "fas fa-italic", "fas fa-j", "fas fa-jar", "fas fa-jar-wheat", "fas fa-jedi", "fas fa-jet-fighter", "fas fa-jet-fighter-up", "fas fa-joint", "fas fa-jug-detergent", "fas fa-k", "fas fa-kaaba", "fas fa-key", "fas fa-keyboard", "fas fa-khanda", "fas fa-kip-sign", "fas fa-kit-medical", "fas fa-kitchen-set", "fas fa-kiwi-bird", "fas fa-l", "fas fa-land-mine-on", "fas fa-landmark", "fas fa-landmark-dome", "fas fa-landmark-flag", "fas fa-language", "fas fa-laptop", "fas fa-laptop-code", "fas fa-laptop-file", "fas fa-laptop-medical", "fas fa-lari-sign", "fas fa-layer-group", "fas fa-leaf", "fas fa-left-long", "fas fa-left-right", "fas fa-lemon", "fas fa-less-than", "fas fa-less-than-equal", "fas fa-life-ring", "fas fa-lightbulb", "fas fa-lines-leaning", "fas fa-link", "fas fa-link-slash", "fas fa-lira-sign", "fas fa-list", "fas fa-list-check", "fas fa-list-ol", "fas fa-list-ul", "fas fa-litecoin-sign", "fas fa-location-arrow", "fas fa-location-crosshairs", "fas fa-location-dot", "fas fa-location-pin", "fas fa-location-pin-lock", "fas fa-lock", "fas fa-lock-open", "fas fa-locust", "fas fa-lungs", "fas fa-lungs-virus", "fas fa-m", "fas fa-magnet", "fas fa-magnifying-glass", "fas fa-magnifying-glass-arrow-right", "fas fa-magnifying-glass-chart", "fas fa-magnifying-glass-dollar", "fas fa-magnifying-glass-location", "fas fa-magnifying-glass-minus", "fas fa-magnifying-glass-plus", "fas fa-manat-sign", "fas fa-map", "fas fa-map-location", "fas fa-map-location-dot", "fas fa-map-pin", "fas fa-marker", "fas fa-mars", "fas fa-mars-and-venus", "fas fa-mars-and-venus-burst", "fas fa-mars-double", "fas fa-mars-stroke", "fas fa-mars-stroke-right", "fas fa-mars-stroke-up", "fas fa-martini-glass", "fas fa-martini-glass-citrus", "fas fa-martini-glass-empty", "fas fa-mask", "fas fa-mask-face", "fas fa-mask-ventilator", "fas fa-masks-theater", "fas fa-mattress-pillow", "fas fa-maximize", "fas fa-medal", "fas fa-memory", "fas fa-menorah", "fas fa-mercury", "fas fa-message", "fas fa-meteor", "fas fa-microchip", "fas fa-microphone", "fas fa-microphone-lines", "fas fa-microphone-lines-slash", "fas fa-microphone-slash", "fas fa-microscope", "fas fa-mill-sign", "fas fa-minimize", "fas fa-minus", "fas fa-mitten", "fas fa-mobile", "fas fa-mobile-button", "fas fa-mobile-retro", "fas fa-mobile-screen", "fas fa-mobile-screen-button", "fas fa-money-bill", "fas fa-money-bill-1", "fas fa-money-bill-1-wave", "fas fa-money-bill-transfer", "fas fa-money-bill-trend-up", "fas fa-money-bill-wave", "fas fa-money-bill-wheat", "fas fa-money-bills", "fas fa-money-check", "fas fa-money-check-dollar", "fas fa-monument", "fas fa-moon", "fas fa-mortar-pestle", "fas fa-mosque", "fas fa-mosquito", "fas fa-mosquito-net", "fas fa-motorcycle", "fas fa-mound", "fas fa-mountain", "fas fa-mountain-city", "fas fa-mountain-sun", "fas fa-mug-hot", "fas fa-mug-saucer", "fas fa-music", "fas fa-n", "fas fa-naira-sign", "fas fa-network-wired", "fas fa-neuter", "fas fa-newspaper", "fas fa-not-equal", "fas fa-notdef", "fas fa-note-sticky", "fas fa-notes-medical", "fas fa-o", "fas fa-object-group", "fas fa-object-ungroup", "fas fa-oil-can", "fas fa-oil-well", "fas fa-om", "fas fa-otter", "fas fa-outdent", "fas fa-p", "fas fa-pager", "fas fa-paint-roller", "fas fa-paintbrush", "fas fa-palette", "fas fa-pallet", "fas fa-panorama", "fas fa-paper-plane", "fas fa-paperclip", "fas fa-parachute-box", "fas fa-paragraph", "fas fa-passport", "fas fa-paste", "fas fa-pause", "fas fa-paw", "fas fa-peace", "fas fa-pen", "fas fa-pen-clip", "fas fa-pen-fancy", "fas fa-pen-nib", "fas fa-pen-ruler", "fas fa-pen-to-square", "fas fa-pencil", "fas fa-people-arrows", "fas fa-people-carry-box", "fas fa-people-group", "fas fa-people-line", "fas fa-people-pulling", "fas fa-people-robbery", "fas fa-people-roof", "fas fa-pepper-hot", "fas fa-percent", "fas fa-person", "fas fa-person-arrow-down-to-line", "fas fa-person-arrow-up-from-line", "fas fa-person-biking", "fas fa-person-booth", "fas fa-person-breastfeeding", "fas fa-person-burst", "fas fa-person-cane", "fas fa-person-chalkboard", "fas fa-person-circle-check", "fas fa-person-circle-exclamation", "fas fa-person-circle-minus", "fas fa-person-circle-plus", "fas fa-person-circle-question", "fas fa-person-circle-xmark", "fas fa-person-digging", "fas fa-person-dots-from-line", "fas fa-person-dress", "fas fa-person-dress-burst", "fas fa-person-drowning", "fas fa-person-falling", "fas fa-person-falling-burst", "fas fa-person-half-dress", "fas fa-person-harassing", "fas fa-person-hiking", "fas fa-person-military-pointing", "fas fa-person-military-rifle", "fas fa-person-military-to-person", "fas fa-person-praying", "fas fa-person-pregnant", "fas fa-person-rays", "fas fa-person-rifle", "fas fa-person-running", "fas fa-person-shelter", "fas fa-person-skating", "fas fa-person-skiing", "fas fa-person-skiing-nordic", "fas fa-person-snowboarding", "fas fa-person-swimming", "fas fa-person-through-window", "fas fa-person-walking", "fas fa-person-walking-arrow-loop-left", "fas fa-person-walking-arrow-right", "fas fa-person-walking-dashed-line-arrow-right", "fas fa-person-walking-luggage", "fas fa-person-walking-with-cane", "fas fa-peseta-sign", "fas fa-peso-sign", "fas fa-phone", "fas fa-phone-flip", "fas fa-phone-slash", "fas fa-phone-volume", "fas fa-photo-film", "fas fa-piggy-bank", "fas fa-pills", "fas fa-pizza-slice", "fas fa-place-of-worship", "fas fa-plane", "fas fa-plane-arrival", "fas fa-plane-circle-check", "fas fa-plane-circle-exclamation", "fas fa-plane-circle-xmark", "fas fa-plane-departure", "fas fa-plane-lock", "fas fa-plane-slash", "fas fa-plane-up", "fas fa-plant-wilt", "fas fa-plate-wheat", "fas fa-play", "fas fa-plug", "fas fa-plug-circle-bolt", "fas fa-plug-circle-check", "fas fa-plug-circle-exclamation", "fas fa-plug-circle-minus", "fas fa-plug-circle-plus", "fas fa-plug-circle-xmark", "fas fa-plus", "fas fa-plus-minus", "fas fa-podcast", "fas fa-poo", "fas fa-poo-storm", "fas fa-poop", "fas fa-power-off", "fas fa-prescription", "fas fa-prescription-bottle", "fas fa-prescription-bottle-medical", "fas fa-print", "fas fa-pump-medical", "fas fa-pump-soap", "fas fa-puzzle-piece", "fas fa-q", "fas fa-qrcode", "fas fa-question", "fas fa-quote-left", "fas fa-quote-right", "fas fa-r", "fas fa-radiation", "fas fa-radio", "fas fa-rainbow", "fas fa-ranking-star", "fas fa-receipt", "fas fa-record-vinyl", "fas fa-rectangle-ad", "fas fa-rectangle-list", "fas fa-rectangle-xmark", "fas fa-recycle", "fas fa-registered", "fas fa-repeat", "fas fa-reply", "fas fa-reply-all", "fas fa-republican", "fas fa-restroom", "fas fa-retweet", "fas fa-ribbon", "fas fa-right-from-bracket", "fas fa-right-left", "fas fa-right-long", "fas fa-right-to-bracket", "fas fa-ring", "fas fa-road", "fas fa-road-barrier", "fas fa-road-bridge", "fas fa-road-circle-check", "fas fa-road-circle-exclamation", "fas fa-road-circle-xmark", "fas fa-road-lock", "fas fa-road-spikes", "fas fa-robot", "fas fa-rocket", "fas fa-rotate", "fas fa-rotate-left", "fas fa-rotate-right", "fas fa-route", "fas fa-rss", "fas fa-ruble-sign", "fas fa-rug", "fas fa-ruler", "fas fa-ruler-combined", "fas fa-ruler-horizontal", "fas fa-ruler-vertical", "fas fa-rupee-sign", "fas fa-rupiah-sign", "fas fa-s", "fas fa-sack-dollar", "fas fa-sack-xmark", "fas fa-sailboat", "fas fa-satellite", "fas fa-satellite-dish", "fas fa-scale-balanced", "fas fa-scale-unbalanced", "fas fa-scale-unbalanced-flip", "fas fa-school", "fas fa-school-circle-check", "fas fa-school-circle-exclamation", "fas fa-school-circle-xmark", "fas fa-school-flag", "fas fa-school-lock", "fas fa-scissors", "fas fa-screwdriver", "fas fa-screwdriver-wrench", "fas fa-scroll", "fas fa-scroll-torah", "fas fa-sd-card", "fas fa-section", "fas fa-seedling", "fas fa-server", "fas fa-shapes", "fas fa-share", "fas fa-share-from-square", "fas fa-share-nodes", "fas fa-sheet-plastic", "fas fa-shekel-sign", "fas fa-shield", "fas fa-shield-cat", "fas fa-shield-dog", "fas fa-shield-halved", "fas fa-shield-heart", "fas fa-shield-virus", "fas fa-ship", "fas fa-shirt", "fas fa-shoe-prints", "fas fa-shop", "fas fa-shop-lock", "fas fa-shop-slash", "fas fa-shower", "fas fa-shrimp", "fas fa-shuffle", "fas fa-shuttle-space", "fas fa-sign-hanging", "fas fa-signal", "fas fa-signature", "fas fa-signs-post", "fas fa-sim-card", "fas fa-sink", "fas fa-sitemap", "fas fa-skull", "fas fa-skull-crossbones", "fas fa-slash", "fas fa-sleigh", "fas fa-sliders", "fas fa-smog", "fas fa-smoking", "fas fa-snowflake", "fas fa-snowman", "fas fa-snowplow", "fas fa-soap", "fas fa-socks", "fas fa-solar-panel", "fas fa-sort", "fas fa-sort-down", "fas fa-sort-up", "fas fa-spa", "fas fa-spaghetti-monster-flying", "fas fa-spell-check", "fas fa-spider", "fas fa-spinner", "fas fa-splotch", "fas fa-spoon", "fas fa-spray-can", "fas fa-spray-can-sparkles", "fas fa-square", "fas fa-square-arrow-up-right", "fas fa-square-caret-down", "fas fa-square-caret-left", "fas fa-square-caret-right", "fas fa-square-caret-up", "fas fa-square-check", "fas fa-square-envelope", "fas fa-square-full", "fas fa-square-h", "fas fa-square-minus", "fas fa-square-nfi", "fas fa-square-parking", "fas fa-square-pen", "fas fa-square-person-confined", "fas fa-square-phone", "fas fa-square-phone-flip", "fas fa-square-plus", "fas fa-square-poll-horizontal", "fas fa-square-poll-vertical", "fas fa-square-root-variable", "fas fa-square-rss", "fas fa-square-share-nodes", "fas fa-square-up-right", "fas fa-square-virus", "fas fa-square-xmark", "fas fa-staff-snake", "fas fa-stairs", "fas fa-stamp", "fas fa-stapler", "fas fa-star", "fas fa-star-and-crescent", "fas fa-star-half", "fas fa-star-half-stroke", "fas fa-star-of-david", "fas fa-star-of-life", "fas fa-sterling-sign", "fas fa-stethoscope", "fas fa-stop", "fas fa-stopwatch", "fas fa-stopwatch-20", "fas fa-store", "fas fa-store-slash", "fas fa-street-view", "fas fa-strikethrough", "fas fa-stroopwafel", "fas fa-subscript", "fas fa-suitcase", "fas fa-suitcase-medical", "fas fa-suitcase-rolling", "fas fa-sun", "fas fa-sun-plant-wilt", "fas fa-superscript", "fas fa-swatchbook", "fas fa-synagogue", "fas fa-syringe", "fas fa-t", "fas fa-table", "fas fa-table-cells", "fas fa-table-cells-column-lock", "fas fa-table-cells-large", "fas fa-table-cells-row-lock", "fas fa-table-cells-row-unlock", "fas fa-table-columns", "fas fa-table-list", "fas fa-table-tennis-paddle-ball", "fas fa-tablet", "fas fa-tablet-button", "fas fa-tablet-screen-button", "fas fa-tablets", "fas fa-tachograph-digital", "fas fa-tag", "fas fa-tags", "fas fa-tape", "fas fa-tarp", "fas fa-tarp-droplet", "fas fa-taxi", "fas fa-teeth", "fas fa-teeth-open", "fas fa-temperature-arrow-down", "fas fa-temperature-arrow-up", "fas fa-temperature-empty", "fas fa-temperature-full", "fas fa-temperature-half", "fas fa-temperature-high", "fas fa-temperature-low", "fas fa-temperature-quarter", "fas fa-temperature-three-quarters", "fas fa-tenge-sign", "fas fa-tent", "fas fa-tent-arrow-down-to-line", "fas fa-tent-arrow-left-right", "fas fa-tent-arrow-turn-left", "fas fa-tent-arrows-down", "fas fa-tents", "fas fa-terminal", "fas fa-text-height", "fas fa-text-slash", "fas fa-text-width", "fas fa-thermometer", "fas fa-thumbs-down", "fas fa-thumbs-up", "fas fa-thumbtack", "fas fa-thumbtack-slash", "fas fa-ticket", "fas fa-ticket-simple", "fas fa-timeline", "fas fa-toggle-off", "fas fa-toggle-on", "fas fa-toilet", "fas fa-toilet-paper", "fas fa-toilet-paper-slash", "fas fa-toilet-portable", "fas fa-toilets-portable", "fas fa-toolbox", "fas fa-tooth", "fas fa-torii-gate", "fas fa-tornado", "fas fa-tower-broadcast", "fas fa-tower-cell", "fas fa-tower-observation", "fas fa-tractor", "fas fa-trademark", "fas fa-traffic-light", "fas fa-trailer", "fas fa-train", "fas fa-train-subway", "fas fa-train-tram", "fas fa-transgender", "fas fa-trash", "fas fa-trash-arrow-up", "fas fa-trash-can", "fas fa-trash-can-arrow-up", "fas fa-tree", "fas fa-tree-city", "fas fa-triangle-exclamation", "fas fa-trophy", "fas fa-trowel", "fas fa-trowel-bricks", "fas fa-truck", "fas fa-truck-arrow-right", "fas fa-truck-droplet", "fas fa-truck-fast", "fas fa-truck-field", "fas fa-truck-field-un", "fas fa-truck-front", "fas fa-truck-medical", "fas fa-truck-monster", "fas fa-truck-moving", "fas fa-truck-pickup", "fas fa-truck-plane", "fas fa-truck-ramp-box", "fas fa-tty", "fas fa-turkish-lira-sign", "fas fa-turn-down", "fas fa-turn-up", "fas fa-tv", "fas fa-u", "fas fa-umbrella", "fas fa-umbrella-beach", "fas fa-underline", "fas fa-universal-access", "fas fa-unlock", "fas fa-unlock-keyhole", "fas fa-up-down", "fas fa-up-down-left-right", "fas fa-up-long", "fas fa-up-right-and-down-left-from-center", "fas fa-up-right-from-square", "fas fa-upload", "fas fa-user", "fas fa-user-astronaut", "fas fa-user-check", "fas fa-user-clock", "fas fa-user-doctor", "fas fa-user-gear", "fas fa-user-graduate", "fas fa-user-group", "fas fa-user-injured", "fas fa-user-large", "fas fa-user-large-slash", "fas fa-user-lock", "fas fa-user-minus", "fas fa-user-ninja", "fas fa-user-nurse", "fas fa-user-pen", "fas fa-user-plus", "fas fa-user-secret", "fas fa-user-shield", "fas fa-user-slash", "fas fa-user-tag", "fas fa-user-tie", "fas fa-user-xmark", "fas fa-users", "fas fa-users-between-lines", "fas fa-users-gear", "fas fa-users-line", "fas fa-users-rays", "fas fa-users-rectangle", "fas fa-users-slash", "fas fa-users-viewfinder", "fas fa-utensils", "fas fa-v", "fas fa-van-shuttle", "fas fa-vault", "fas fa-vector-square", "fas fa-venus", "fas fa-venus-double", "fas fa-venus-mars", "fas fa-vest", "fas fa-vest-patches", "fas fa-vial", "fas fa-vial-circle-check", "fas fa-vial-virus", "fas fa-vials", "fas fa-video", "fas fa-video-slash", "fas fa-vihara", "fas fa-virus", "fas fa-virus-covid", "fas fa-virus-covid-slash", "fas fa-virus-slash", "fas fa-viruses", "fas fa-voicemail", "fas fa-volcano", "fas fa-volleyball", "fas fa-volume-high", "fas fa-volume-low", "fas fa-volume-off", "fas fa-volume-xmark", "fas fa-vr-cardboard", "fas fa-w", "fas fa-walkie-talkie", "fas fa-wallet", "fas fa-wand-magic", "fas fa-wand-magic-sparkles", "fas fa-wand-sparkles", "fas fa-warehouse", "fas fa-water", "fas fa-water-ladder", "fas fa-wave-square", "fas fa-weight-hanging", "fas fa-weight-scale", "fas fa-wheat-awn", "fas fa-wheat-awn-circle-exclamation", "fas fa-wheelchair", "fas fa-wheelchair-move", "fas fa-whiskey-glass", "fas fa-wifi", "fas fa-wind", "fas fa-window-maximize", "fas fa-window-minimize", "fas fa-window-restore", "fas fa-wine-bottle", "fas fa-wine-glass", "fas fa-wine-glass-empty", "fas fa-won-sign", "fas fa-worm", "fas fa-wrench", "fas fa-x", "fas fa-x-ray", "fas fa-xmark", "fas fa-xmarks-lines", "fas fa-y", "fas fa-yen-sign", "fas fa-yin-yang", "fas fa-z", "far fa-address-book", "far fa-address-card", "far fa-bell", "far fa-bell-slash", "far fa-bookmark", "far fa-building", "far fa-calendar", "far fa-calendar-check", "far fa-calendar-days", "far fa-calendar-minus", "far fa-calendar-plus", "far fa-calendar-xmark", "far fa-chart-bar", "far fa-chess-bishop", "far fa-chess-king", "far fa-chess-knight", "far fa-chess-pawn", "far fa-chess-queen", "far fa-chess-rook", "far fa-circle", "far fa-circle-check", "far fa-circle-dot", "far fa-circle-down", "far fa-circle-left", "far fa-circle-pause", "far fa-circle-play", "far fa-circle-question", "far fa-circle-right", "far fa-circle-stop", "far fa-circle-up", "far fa-circle-user", "far fa-circle-xmark", "far fa-clipboard", "far fa-clock", "far fa-clone", "far fa-closed-captioning", "far fa-comment", "far fa-comment-dots", "far fa-comments", "far fa-compass", "far fa-copy", "far fa-copyright", "far fa-credit-card", "far fa-envelope", "far fa-envelope-open", "far fa-eye", "far fa-eye-slash", "far fa-face-angry", "far fa-face-dizzy", "far fa-face-flushed", "far fa-face-frown", "far fa-face-frown-open", "far fa-face-grimace", "far fa-face-grin", "far fa-face-grin-beam", "far fa-face-grin-beam-sweat", "far fa-face-grin-hearts", "far fa-face-grin-squint", "far fa-face-grin-squint-tears", "far fa-face-grin-stars", "far fa-face-grin-tears", "far fa-face-grin-tongue", "far fa-face-grin-tongue-squint", "far fa-face-grin-tongue-wink", "far fa-face-grin-wide", "far fa-face-grin-wink", "far fa-face-kiss", "far fa-face-kiss-beam", "far fa-face-kiss-wink-heart", "far fa-face-laugh", "far fa-face-laugh-beam", "far fa-face-laugh-squint", "far fa-face-laugh-wink", "far fa-face-meh", "far fa-face-meh-blank", "far fa-face-rolling-eyes", "far fa-face-sad-cry", "far fa-face-sad-tear", "far fa-face-smile", "far fa-face-smile-beam", "far fa-face-smile-wink", "far fa-face-surprise", "far fa-face-tired", "far fa-file", "far fa-file-audio", "far fa-file-code", "far fa-file-excel", "far fa-file-image", "far fa-file-lines", "far fa-file-pdf", "far fa-file-powerpoint", "far fa-file-video", "far fa-file-word", "far fa-file-zipper", "far fa-flag", "far fa-floppy-disk", "far fa-folder", "far fa-folder-closed", "far fa-folder-open", "far fa-font-awesome", "far fa-futbol", "far fa-gem", "far fa-hand", "far fa-hand-back-fist", "far fa-hand-lizard", "far fa-hand-peace", "far fa-hand-point-down", "far fa-hand-point-left", "far fa-hand-point-right", "far fa-hand-point-up", "far fa-hand-pointer", "far fa-hand-scissors", "far fa-hand-spock", "far fa-handshake", "far fa-hard-drive", "far fa-heart", "far fa-hospital", "far fa-hourglass", "far fa-hourglass-half", "far fa-id-badge", "far fa-id-card", "far fa-image", "far fa-images", "far fa-keyboard", "far fa-lemon", "far fa-life-ring", "far fa-lightbulb", "far fa-map", "far fa-message", "far fa-money-bill-1", "far fa-moon", "far fa-newspaper", "far fa-note-sticky", "far fa-object-group", "far fa-object-ungroup", "far fa-paper-plane", "far fa-paste", "far fa-pen-to-square", "far fa-rectangle-list", "far fa-rectangle-xmark", "far fa-registered", "far fa-share-from-square", "far fa-snowflake", "far fa-square", "far fa-square-caret-down", "far fa-square-caret-left", "far fa-square-caret-right", "far fa-square-caret-up", "far fa-square-check", "far fa-square-full", "far fa-square-minus", "far fa-square-plus", "far fa-star", "far fa-star-half", "far fa-star-half-stroke", "far fa-sun", "far fa-thumbs-down", "far fa-thumbs-up", "far fa-trash-can", "far fa-user", "far fa-window-maximize", "far fa-window-minimize", "far fa-window-restore"];
    }

    // noinspection JSUnusedGlobalSymbols
    actionSelect(data) {
      this.trigger('select', data.value);
    }
    getIconDataList() {
      const rowList = [];
      this.iconList.forEach((item, i) => {
        if (i % 12 === 0) {
          rowList.push([]);
        }
        rowList[rowList.length - 1].push(item);
      });
      return rowList;
    }
    processQuickSearch(filter) {
      if (!filter) {
        this.$el.find('.icon-container').removeClass('hidden');
        return;
      }
      const $container = this.$el.find('.icons');
      this.iconList.forEach(item => {
        let $icon = this.itemCache[item];
        if (!$icon) {
          $icon = $container.find(`> .icon-container[data-name="${item}"]`);
          this.itemCache[item] = $icon;
        }
        if (~item.indexOf(filter)) {
          $icon.removeClass('hidden');
          return;
        }
        $icon.addClass('hidden');
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/entity-manager/modals/select-formula", ["exports", "views/modal"], function (_exports, _modal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _modal.default {
    // language=Handlebars
    templateContent = `
        <div class="panel no-side-margin">
            <table class="table table-bordered">
                {{#each typeList}}
                <tr>
                    <td style="width: 40%">
                        <a
                            class="btn btn-default btn-lg btn-full-wide"
                            href="#Admin/entityManager/formula&scope={{../scope}}&type={{this}}"
                        >
                        {{translate this category='fields' scope='EntityManager'}}
                        </a>
                    </td>
                    <td style="width: 60%">
                        <div class="complex-text">{{complexText (translate this category='messages' scope='EntityManager')}}
                    </td>
                </tr>
                {{/each}}
            </table>
        </div>
    `;
    backdrop = true;
    data() {
      return {
        typeList: this.typeList,
        scope: this.scope
      };
    }
    setup() {
      this.scope = this.options.scope;
      this.typeList = ['beforeSaveCustomScript', 'beforeSaveApiScript'];
      this.headerText = this.translate('Formula', 'labels', 'EntityManager');
    }
  }
  _exports.default = _default;
});

define("views/admin/entity-manager/fields/icon-class", ["exports", "views/fields/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    editTemplate = 'admin/entity-manager/fields/icon-class/edit';
    setup() {
      super.setup();
      this.addActionHandler('selectIcon', () => this.selectIcon());
    }
    selectIcon() {
      this.createView('dialog', 'views/admin/entity-manager/modals/select-icon', {}, view => {
        view.render();
        this.listenToOnce(view, 'select', value => {
          if (value === '') {
            value = null;
          }
          this.model.set(this.name, value);
          view.close();
        });
      });
    }
    fetch() {
      const data = {};
      data[this.name] = this.model.get(this.name);
      return data;
    }
  }
  _exports.default = _default;
});

define("views/admin/entity-manager/fields/duplicate-check-field-list", ["exports", "views/fields/multi-enum"], function (_exports, _multiEnum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class DuplicateFieldListCheckEntityManagerFieldView extends _multiEnum.default {
    fieldTypeList = ['varchar', 'personName', 'email', 'phone', 'url', 'barcode'];
    setupOptions() {
      let entityType = this.model.get('name');
      let options = this.getFieldManager().getEntityTypeFieldList(entityType, {
        typeList: this.fieldTypeList,
        onlyAvailable: true
      }).sort((a, b) => {
        return this.getLanguage().translate(a, 'fields', this.entityType).localeCompare(this.getLanguage().translate(b, 'fields', this.entityType));
      });
      this.translatedOptions = {};
      options.forEach(item => {
        this.translatedOptions[item] = this.translate(item, 'fields', entityType);
      });
      this.params.options = options;
    }
  }
  var _default = _exports.default = DuplicateFieldListCheckEntityManagerFieldView;
});

define("views/admin/entity-manager/fields/acl-account-link", ["exports", "views/admin/entity-manager/fields/acl-contact-link"], function (_exports, _aclContactLink) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _aclContactLink = _interopRequireDefault(_aclContactLink);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _aclContactLink.default {
    targetEntityType = 'Account';
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/modals/edit", ["exports", "views/modal"], function (_exports, _modal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _modal.default {
    template = 'admin/dynamic-logic/modals/edit';
    className = 'dialog dialog-record';
    data() {
      return {};
    }
    setup() {
      this.conditionGroup = Espo.Utils.cloneDeep(this.options.conditionGroup || []);
      this.scope = this.options.scope;
      this.buttonList = [{
        name: 'apply',
        label: 'Apply',
        style: 'primary',
        onClick: () => this.actionApply()
      }, {
        name: 'cancel',
        label: 'Cancel'
      }];
      this.createView('conditionGroup', 'views/admin/dynamic-logic/conditions/and', {
        selector: '.top-group-container',
        itemData: {
          value: this.conditionGroup
        },
        scope: this.options.scope
      });
    }
    actionApply() {
      const conditionGroupView = /** @type {import('../conditions/and').default} */
      this.getView('conditionGroup');
      const data = conditionGroupView.fetch();
      const conditionGroup = data.value;
      this.trigger('apply', conditionGroup);
      this.close();
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/modals/add-field", ["exports", "views/modal", "model"], function (_exports, _modal, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _modal.default {
    templateContent = `<div class="field" data-name="field">{{{field}}}</div>`;
    setup() {
      this.addActionHandler('addField', (e, target) => {
        this.trigger('add-field', target.dataset.name);
      });
      this.headerText = this.translate('Add Field');
      this.scope = this.options.scope;
      const model = new _model.default();
      this.createView('field', 'views/admin/dynamic-logic/fields/field', {
        selector: '[data-name="field"]',
        model: model,
        mode: 'edit',
        scope: this.scope,
        defs: {
          name: 'field',
          params: {}
        }
      }, view => {
        this.listenTo(view, 'change', () => {
          const list = model.get('field') || [];
          if (!list.length) {
            return;
          }
          this.trigger('add-field', list[0]);
        });
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/fields/user-id", ["exports", "views/fields/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    // language=Handlebars
    detailTemplateContent = `
        <a href="#User/view/{{id}}">{{name}}</a>
    `;
    data() {
      return {
        id: this.model.get('$user.id'),
        name: this.model.get('name')
      };
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/fields/field", ["exports", "views/fields/multi-enum", "ui/multi-select"], function (_exports, _multiEnum, _multiSelect) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _multiEnum = _interopRequireDefault(_multiEnum);
  _multiSelect = _interopRequireDefault(_multiSelect);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _multiEnum.default {
    getFieldList() {
      /** @type {Record<string, Record>} */
      const fields = this.getMetadata().get(`entityDefs.${this.options.scope}.fields`);
      const filterList = Object.keys(fields).filter(field => {
        const fieldType = fields[field].type || null;
        if (fields[field].disabled || fields[field].utility) {
          return;
        }
        if (!fieldType) {
          return;
        }
        if (!this.getMetadata().get(['clientDefs', 'DynamicLogic', 'fieldTypes', fieldType])) {
          return;
        }
        return true;
      });
      filterList.push('id');
      filterList.sort((v1, v2) => {
        return this.translate(v1, 'fields', this.options.scope).localeCompare(this.translate(v2, 'fields', this.options.scope));
      });
      return filterList;
    }
    setupTranslatedOptions() {
      this.translatedOptions = {};
      this.params.options.forEach(item => {
        this.translatedOptions[item] = this.translate(item, 'fields', this.options.scope);
      });
    }
    setupOptions() {
      super.setupOptions();
      this.params.options = this.getFieldList();
      this.setupTranslatedOptions();
    }
    afterRender() {
      super.afterRender();
      if (this.$element) {
        _multiSelect.default.focus(this.$element);
      }
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions-string/item-value-varchar", ["exports", "views/admin/dynamic-logic/conditions-string/item-base"], function (_exports, _itemBase) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _itemBase = _interopRequireDefault(_itemBase);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _itemBase.default {
    template = 'admin/dynamic-logic/conditions-string/item-base';
    createValueFieldView() {
      const key = this.getValueViewKey();
      const viewName = 'views/fields/varchar';
      this.createView('value', viewName, {
        model: this.model,
        name: this.field,
        selector: `[data-view-key="${key}"]`,
        readOnly: true
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions-string/item-value-link", ["exports", "views/admin/dynamic-logic/conditions-string/item-base"], function (_exports, _itemBase) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _itemBase = _interopRequireDefault(_itemBase);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _itemBase.default {
    template = 'admin/dynamic-logic/conditions-string/item-base';
    createValueFieldView() {
      const key = this.getValueViewKey();
      const viewName = 'views/fields/link';
      const foreignScope = this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'entity']) || this.getMetadata().get(['entityDefs', this.scope, 'links', this.field, 'entity']);
      this.createView('value', viewName, {
        model: this.model,
        name: 'link',
        selector: `[data-view-key="${key}"]`,
        readOnly: true,
        foreignScope: foreignScope
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions-string/item-value-enum", ["exports", "views/admin/dynamic-logic/conditions-string/item-base"], function (_exports, _itemBase) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _itemBase = _interopRequireDefault(_itemBase);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _itemBase.default {
    template = 'admin/dynamic-logic/conditions-string/item-base';
    createValueFieldView() {
      const key = this.getValueViewKey();
      const viewName = 'views/fields/enum';
      this.createView('value', viewName, {
        model: this.model,
        name: this.field,
        selector: `[data-view-key="${key}"]`,
        params: {
          options: this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'options']) || []
        },
        readOnly: true
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions-string/item-multiple-values-base", ["exports", "views/admin/dynamic-logic/conditions-string/item-base"], function (_exports, _itemBase) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _itemBase = _interopRequireDefault(_itemBase);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _itemBase.default {
    template = 'admin/dynamic-logic/conditions-string/item-multiple-values-base';
    data() {
      return {
        valueViewDataList: this.valueViewDataList,
        scope: this.scope,
        operator: this.operator,
        operatorString: this.operatorString,
        field: this.field
      };
    }
    populateValues() {}
    getValueViewKey(i) {
      return `view-${this.level.toString()}-${this.number.toString()}-${i.toString()}`;
    }
    createValueFieldView() {
      const valueList = this.itemData.value || [];
      const fieldType = this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'type']) || 'base';
      const viewName = this.getMetadata().get(['entityDefs', this.scope, 'fields', this.field, 'view']) || this.getFieldManager().getViewName(fieldType);
      this.valueViewDataList = [];
      valueList.forEach((value, i) => {
        const model = this.model.clone();
        model.set(this.itemData.attribute, value);
        const key = this.getValueViewKey(i);
        this.valueViewDataList.push({
          key: key,
          isEnd: i === valueList.length - 1
        });
        this.createView(key, viewName, {
          model: model,
          name: this.field,
          selector: `[data-view-key="${key}"]`,
          readOnly: true
        });
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions-string/item-is-today", ["exports", "views/admin/dynamic-logic/conditions-string/item-operator-only-date"], function (_exports, _itemOperatorOnlyDate) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _itemOperatorOnlyDate = _interopRequireDefault(_itemOperatorOnlyDate);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _itemOperatorOnlyDate.default {
    dateValue = 'today';
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions-string/item-in-past", ["exports", "views/admin/dynamic-logic/conditions-string/item-operator-only-date"], function (_exports, _itemOperatorOnlyDate) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _itemOperatorOnlyDate = _interopRequireDefault(_itemOperatorOnlyDate);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _itemOperatorOnlyDate.default {
    dateValue = 'past';
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions-string/item-in-future", ["exports", "views/admin/dynamic-logic/conditions-string/item-operator-only-date"], function (_exports, _itemOperatorOnlyDate) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _itemOperatorOnlyDate = _interopRequireDefault(_itemOperatorOnlyDate);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _itemOperatorOnlyDate.default {
    dateValue = 'future';
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions-string/group-not", ["exports", "views/admin/dynamic-logic/conditions-string/group-base"], function (_exports, _groupBase) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _groupBase = _interopRequireDefault(_groupBase);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class DynamicLogicConditionsStringGroupNotView extends _groupBase.default {
    template = 'admin/dynamic-logic/conditions-string/group-not';
    data() {
      return {
        viewKey: this.viewKey,
        operator: this.operator
      };
    }
    setup() {
      this.level = this.options.level || 0;
      this.number = this.options.number || 0;
      this.scope = this.options.scope;
      this.operator = this.options.operator || this.operator;
      this.itemData = this.options.itemData || {};
      this.viewList = [];
      const i = 0;
      const key = `view-${this.level.toString()}-${this.number.toString()}-${i.toString()}`;
      this.createItemView(i, key, this.itemData.value);
      this.viewKey = key;
    }
  }
  _exports.default = DynamicLogicConditionsStringGroupNotView;
});

define("views/admin/dynamic-logic/conditions/or", ["exports", "views/admin/dynamic-logic/conditions/group-base"], function (_exports, _groupBase) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _groupBase = _interopRequireDefault(_groupBase);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _groupBase.default {
    operator = 'or';
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions/not", ["exports", "views/admin/dynamic-logic/conditions/group-base"], function (_exports, _groupBase) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _groupBase = _interopRequireDefault(_groupBase);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _groupBase.default {
    template = 'admin/dynamic-logic/conditions/not';
    operator = 'not';
    data() {
      return {
        viewKey: this.viewKey,
        operator: this.operator,
        hasItem: this.hasView(this.viewKey),
        level: this.level,
        groupOperator: this.getGroupOperator()
      };
    }
    setup() {
      this.level = this.options.level || 0;
      this.number = this.options.number || 0;
      this.scope = this.options.scope;
      this.itemData = this.options.itemData || {};
      this.viewList = [];
      const i = 0;
      const key = this.getKey();
      this.createItemView(i, key, this.itemData.value);
      this.viewKey = key;
    }
    removeItem() {
      const key = this.getKey();
      this.clearView(key);
      this.controlAddItemVisibility();
    }
    getKey() {
      const i = 0;
      return `view-${this.level.toString()}-${this.number.toString()}-${i.toString()}`;
    }
    getIndexForNewItem() {
      return 0;
    }
    addItemContainer() {}
    addViewDataListItem() {}
    fetch() {
      /** @type {import('./field-types/base').default} */
      const view = this.getView(this.viewKey);
      if (!view) {
        return {
          type: 'and',
          value: []
        };
      }
      const value = view.fetch();
      return {
        type: this.operator,
        value: value
      };
    }
    controlAddItemVisibility() {
      if (this.getView(this.getKey())) {
        this.$el.find(' > .group-bottom').addClass('hidden');
      } else {
        this.$el.find(' > .group-bottom').removeClass('hidden');
      }
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions/and", ["exports", "views/admin/dynamic-logic/conditions/group-base"], function (_exports, _groupBase) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _groupBase = _interopRequireDefault(_groupBase);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _groupBase.default {
    operator = 'and';
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions/field-types/multi-enum", ["exports", "views/admin/dynamic-logic/conditions/field-types/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    fetch() {
      /** @type {import('views/fields/base').default} */
      const valueView = this.getView('value');
      const item = {
        type: this.type,
        attribute: this.field
      };
      if (valueView) {
        valueView.fetchToModel();
        item.value = this.model.get(this.field);
      }
      return item;
    }
    getValueViewName() {
      let viewName = super.getValueViewName();
      if (['has', 'notHas'].includes(this.type)) {
        viewName = 'views/fields/enum';
      }
      return viewName;
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions/field-types/link", ["exports", "views/admin/dynamic-logic/conditions/field-types/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    fetch() {
      /** @type {import('views/fields/base').default} */
      const valueView = this.getView('value');
      const item = {
        type: this.type,
        attribute: this.field + 'Id',
        data: {
          field: this.field
        }
      };
      if (valueView) {
        valueView.fetchToModel();
        item.value = this.model.get(`${this.field}Id`);
        const values = {};
        values[this.field + 'Name'] = this.model.get(`${this.field}Name`);
        item.data.values = values;
      }
      return item;
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions/field-types/link-parent", ["exports", "views/admin/dynamic-logic/conditions/field-types/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    fetch() {
      /** @type {import('views/fields/base').default} */
      const valueView = this.getView('value');
      let item;
      if (valueView) {
        valueView.fetchToModel();
      }
      if (this.type === 'equals' || this.type === 'notEquals') {
        const values = {};
        values[this.field + 'Id'] = valueView.model.get(this.field + 'Id');
        values[this.field + 'Name'] = valueView.model.get(this.field + 'Name');
        values[this.field + 'Type'] = valueView.model.get(this.field + 'Type');
        if (this.type === 'equals') {
          item = {
            type: 'and',
            value: [{
              type: 'equals',
              attribute: this.field + 'Id',
              value: valueView.model.get(this.field + 'Id')
            }, {
              type: 'equals',
              attribute: this.field + 'Type',
              value: valueView.model.get(this.field + 'Type')
            }],
            data: {
              field: this.field,
              type: 'equals',
              values: values
            }
          };
        } else {
          item = {
            type: 'or',
            value: [{
              type: 'notEquals',
              attribute: this.field + 'Id',
              value: valueView.model.get(this.field + 'Id')
            }, {
              type: 'notEquals',
              attribute: this.field + 'Type',
              value: valueView.model.get(this.field + 'Type')
            }],
            data: {
              field: this.field,
              type: 'notEquals',
              values: values
            }
          };
        }
      } else {
        item = {
          type: this.type,
          attribute: this.field + 'Id',
          data: {
            field: this.field
          }
        };
      }
      return item;
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions/field-types/enum", ["exports", "views/admin/dynamic-logic/conditions/field-types/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    fetch() {
      /** @type {import('views/fields/base').default} */
      const valueView = this.getView('value');
      const item = {
        type: this.type,
        attribute: this.field
      };
      if (valueView) {
        valueView.fetchToModel();
        item.value = this.model.get(this.field);
      }
      return item;
    }
    getValueViewName() {
      let viewName = super.getValueViewName();
      if (['in', 'notIn'].includes(this.type)) {
        viewName = 'views/fields/multi-enum';
      }
      return viewName;
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions/field-types/date", ["exports", "views/admin/dynamic-logic/conditions/field-types/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {}
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions/field-types/current-user", ["exports", "views/admin/dynamic-logic/conditions/field-types/base", "model"], function (_exports, _base, _model) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    getValueViewName() {
      return 'views/fields/user';
    }
    getValueFieldName() {
      return 'link';
    }
    createModel() {
      const model = new _model.default();
      model.setDefs({
        fields: {
          link: {
            type: 'link',
            entity: 'User'
          }
        }
      });
      return Promise.resolve(model);
    }
    populateValues() {
      if (this.itemData.attribute) {
        this.model.set('linkId', this.itemData.value);
      }
      const name = (this.additionalData.values || {}).name;
      this.model.set('linkName', name);
    }
    translateLeftString() {
      return '$' + this.translate('User', 'scopeNames');
    }
    fetch() {
      /** @type {import('views/fields/base').default} */
      const valueView = this.getView('value');
      valueView.fetchToModel();
      return {
        type: this.type,
        attribute: '$user.id',
        data: {
          values: {
            name: this.model.get('linkName')
          }
        },
        value: this.model.get('linkId')
      };
    }
  }
  _exports.default = _default;
});

define("views/admin/dynamic-logic/conditions/field-types/current-user-teams", ["exports", "views/admin/dynamic-logic/conditions/field-types/link-multiple"], function (_exports, _linkMultiple) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _linkMultiple = _interopRequireDefault(_linkMultiple);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _linkMultiple.default {
    translateLeftString() {
      return '$' + this.translate('User', 'scopeNames') + '.' + super.translateLeftString();
    }
    fetch() {
      const data = super.fetch();
      data.attribute = '$user.teamsIds';
      return data;
    }
  }
  _exports.default = _default;
});

define("views/admin/complex-expression/modals/add-function", ["exports", "views/modal"], function (_exports, _modal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _modal = _interopRequireDefault(_modal);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class ComplexExpressionAddFunctionModalView extends _modal.default {
    template = 'admin/formula/modals/add-function';
    backdrop = true;
    data() {
      let text = this.translate('formulaFunctions', 'messages', 'Admin').replace('{documentationUrl}', this.documentationUrl);
      text = this.getHelper().transformMarkdownText(text, {
        linksInNewTab: true
      }).toString();
      return {
        functionDataList: this.functionDataList,
        text: text
      };
    }
    setup() {
      this.addActionHandler('add', (e, target) => {
        this.trigger('add', target.dataset.value);
      });
      this.headerText = this.translate('Function');
      this.documentationUrl = 'https://docs.espocrm.com/user-guide/complex-expressions/';
      this.functionDataList = this.options.functionDataList || this.getMetadata().get('app.complexExpression.functionList') || [];
    }
  }
  _exports.default = ComplexExpressionAddFunctionModalView;
});

define("views/admin/authentication/fields/test-connection", ["exports", "views/fields/base"], function (_exports, _base) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _base = _interopRequireDefault(_base);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _base.default {
    // language=Handlebars
    templateContent = `
        <button
            class="btn btn-default"
            data-action="testConnection"
        >{{translate \'Test Connection\' scope=\'Settings\'}}</button>
    `;
    fetch() {
      return {};
    }
    setup() {
      super.setup();
      this.addActionHandler('testConnection', () => this.testConnection());
    }
    getConnectionData() {
      return {
        'host': this.model.get('ldapHost'),
        'port': this.model.get('ldapPort'),
        'useSsl': this.model.get('ldapSecurity'),
        'useStartTls': this.model.get('ldapSecurity'),
        'username': this.model.get('ldapUsername'),
        'password': this.model.get('ldapPassword'),
        'bindRequiresDn': this.model.get('ldapBindRequiresDn'),
        'accountDomainName': this.model.get('ldapAccountDomainName'),
        'accountDomainNameShort': this.model.get('ldapAccountDomainNameShort'),
        'accountCanonicalForm': this.model.get('ldapAccountCanonicalForm')
      };
    }
    testConnection() {
      const data = this.getConnectionData();
      this.$el.find('button').prop('disabled', true);
      Espo.Ui.notify(this.translate('Connecting', 'labels', 'Settings'));
      Espo.Ajax.postRequest('Ldap/action/testConnection', data).then(() => {
        this.$el.find('button').prop('disabled', false);
        Espo.Ui.success(this.translate('ldapTestConnection', 'messages', 'Settings'));
      }).catch(xhr => {
        let statusReason = xhr.getResponseHeader('X-Status-Reason') || '';
        statusReason = statusReason.replace(/ $/, '');
        statusReason = statusReason.replace(/,$/, '');
        let msg = this.translate('Error') + ' ' + xhr.status;
        if (statusReason) {
          msg += ': ' + statusReason;
        }
        Espo.Ui.error(msg, true);
        console.error(msg);
        xhr.errorIsHandled = true;
        this.$el.find('button').prop('disabled', false);
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/auth-token/list", ["exports", "views/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    createButton = false;
    getHeader() {
      const a = document.createElement('a');
      a.href = '#Admin';
      a.innerText = this.translate('Administration');
      const text = document.createElement('span');
      text.innerText = this.getLanguage().translate('Auth Tokens', 'labels', 'Admin');
      return this.buildHeaderHtml([a, text]);
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Auth Tokens', 'labels', 'Admin'));
    }
  }
  _exports.default = _default;
});

define("views/admin/auth-token/record/list", ["exports", "views/record/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    rowActionsView = 'views/admin/auth-token/record/row-actions/default';
    massActionList = ['remove', 'setInactive'];
    checkAllResultMassActionList = ['remove', 'setInactive'];

    // noinspection JSUnusedGlobalSymbols
    massActionSetInactive() {
      let ids = null;
      const allResultIsChecked = this.allResultIsChecked;
      if (!allResultIsChecked) {
        ids = this.checkedList;
      }
      const attributes = {
        isActive: false
      };
      Espo.Ajax.postRequest('MassAction', {
        action: 'update',
        entityType: this.entityType,
        params: {
          ids: ids || null,
          where: !ids || ids.length === 0 ? this.collection.getWhere() : null,
          searchParams: !ids || ids.length === 0 ? this.collection.data : null
        },
        data: attributes
      }).then(() => {
        this.collection.fetch().then(() => {
          Espo.Ui.success(this.translate('Done'));
          if (ids) {
            ids.forEach(id => {
              this.checkRecord(id);
            });
          }
        });
      });
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {Record} data
     */
    actionSetInactive(data) {
      if (!data.id) {
        return;
      }
      const model = this.collection.get(data.id);
      if (!model) {
        return;
      }
      Espo.Ui.notify(this.translate('pleaseWait', 'messages'));
      model.save({
        'isActive': false
      }, {
        patch: true
      }).then(() => {
        Espo.Ui.notify(false);
      });
    }
  }
  _exports.default = _default;
});

define("views/admin/auth-token/record/detail", ["exports", "views/record/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    sideDisabled = true;
    readOnly = true;
  }
  _exports.default = _default;
});

define("views/admin/auth-token/record/detail-small", ["exports", "views/record/detail-small"], function (_exports, _detailSmall) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detailSmall = _interopRequireDefault(_detailSmall);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detailSmall.default {
    sideDisabled = true;
    isWide = true;
    bottomView = 'views/record/detail-bottom';
  }
  _exports.default = _default;
});

define("views/admin/auth-token/record/row-actions/default", ["exports", "views/record/row-actions/default"], function (_exports, _default2) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _default2 = _interopRequireDefault(_default2);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _default2.default {
    setup() {
      super.setup();
      this.listenTo(this.model, 'change:isActive', () => {
        setTimeout(() => this.reRender(), 10);
      });
    }
    getActionList() {
      const list = [];
      list.push({
        action: 'quickView',
        label: 'View',
        data: {
          id: this.model.id
        }
      });
      if (this.model.get('isActive')) {
        list.push({
          action: 'setInactive',
          label: 'Set Inactive',
          data: {
            id: this.model.id
          }
        });
      }
      list.push({
        action: 'quickRemove',
        label: 'Remove',
        data: {
          id: this.model.id
        }
      });
      return list;
    }
  }
  _exports.default = _default;
});

define("views/admin/auth-token/modals/detail", ["exports", "views/modals/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    sideDisabled = true;
    editDisabled = true;
  }
  _exports.default = _default;
});

define("views/admin/auth-log-record/list", ["exports", "views/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    getHeader() {
      return this.buildHeaderHtml([$('<a>').attr('href', '#Admin').text(this.translate('Administration')), $('<span>').text(this.getLanguage().translate('Auth Log', 'labels', 'Admin'))]);
    }
    updatePageTitle() {
      this.setPageTitle(this.getLanguage().translate('Auth Log', 'labels', 'Admin'));
    }
  }
  _exports.default = _default;
});

define("views/admin/auth-log-record/record/list", ["exports", "views/record/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    rowActionsView = 'views/record/row-actions/view-and-remove';
    massActionList = ['remove'];
    checkAllResultMassActionList = ['remove'];
    forceSettings = true;
  }
  _exports.default = _default;
});

define("views/admin/auth-log-record/record/detail", ["exports", "views/record/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    sideDisabled = true;
    readOnly = true;
  }
  _exports.default = _default;
});

define("views/admin/auth-log-record/record/detail-small", ["exports", "views/record/detail-small"], function (_exports, _detailSmall) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detailSmall = _interopRequireDefault(_detailSmall);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detailSmall.default {
    sideDisabled = true;
    isWide = true;
    bottomView = 'views/record/detail-bottom';
  }
  _exports.default = _default;
});

define("views/admin/auth-log-record/modals/detail", ["exports", "views/modals/detail"], function (_exports, _detail) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _detail = _interopRequireDefault(_detail);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _detail.default {
    sideDisabled = true;
    editDisabled = true;
  }
  _exports.default = _default;
});

define("views/admin/auth-log-record/fields/authentication-method", ["exports", "views/fields/enum"], function (_exports, _enum) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _enum = _interopRequireDefault(_enum);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _enum.default {
    setupOptions() {
      this.params.options = Object.keys(this.getMetadata().get('authenticationMethods') || {});
    }
  }
  _exports.default = _default;
});

define("views/admin/app-secret/fields/value", ["exports", "views/fields/text"], function (_exports, _text) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _text = _interopRequireDefault(_text);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _text.default {
    detailTemplateContent = `**********`;
    validations = ['required'];
    changingMode = false;
    data() {
      return {
        isNew: this.model.isNew(),
        ...super.data()
      };
    }
    afterRenderEdit() {
      super.afterRenderEdit();
      if (!this.model.isNew() && !this.changingMode) {
        this.element.innerHTML = '';
        const a = document.createElement('a');
        a.role = 'button';
        a.onclick = () => this.changePassword();
        a.textContent = this.translate('change');
        this.element.appendChild(a);
      }
    }
    onDetailModeSet() {
      this.changingMode = false;
      return super.onDetailModeSet();
    }
    fetch() {
      if (!this.model.isNew() && !this.changingMode) {
        return {};
      }
      return super.fetch();
    }
    async changePassword() {
      this.changingMode = true;
      await this.reRender();
    }
  }
  _exports.default = _default;
});

define("views/admin/app-log-record/record/list", ["exports", "views/record/list"], function (_exports, _list) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _list = _interopRequireDefault(_list);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class _default extends _list.default {
    forceSettings = true;
  }
  _exports.default = _default;
});

define("controllers/role", ["exports", "controllers/record"], function (_exports, _record) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _record = _interopRequireDefault(_record);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class RoleController extends _record.default {
    checkAccess(action) {
      if (this.getUser().isAdmin()) {
        return true;
      }
      return false;
    }
  }
  var _default = _exports.default = RoleController;
});

define("controllers/portal-role", ["exports", "controllers/record"], function (_exports, _record) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _record = _interopRequireDefault(_record);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class PortalRoleController extends _record.default {
    checkAccess(action) {
      if (this.getUser().isAdmin()) {
        return true;
      }
      return false;
    }
  }
  var _default = _exports.default = PortalRoleController;
});

define("controllers/admin", ["exports", "controller", "search-manager", "views/settings/edit", "views/admin/index"], function (_exports, _controller, _searchManager, _edit, _index) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  _controller = _interopRequireDefault(_controller);
  _searchManager = _interopRequireDefault(_searchManager);
  _edit = _interopRequireDefault(_edit);
  _index = _interopRequireDefault(_index);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  /************************************************************************
   * This file is part of EspoCRM.
   *
   * EspoCRM – Open Source CRM application.
   * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
   * Website: https://www.espocrm.com
   *
   * This program is free software: you can redistribute it and/or modify
   * it under the terms of the GNU Affero General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * This program is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
   * GNU Affero General Public License for more details.
   *
   * You should have received a copy of the GNU Affero General Public License
   * along with this program. If not, see <https://www.gnu.org/licenses/>.
   *
   * The interactive user interfaces in modified source and object code versions
   * of this program must display Appropriate Legal Notices, as required under
   * Section 5 of the GNU Affero General Public License version 3.
   *
   * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
   * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
   ************************************************************************/

  class AdminController extends _controller.default {
    checkAccessGlobal() {
      if (this.getUser().isAdmin()) {
        return true;
      }
      return false;
    }

    // noinspection JSUnusedGlobalSymbols
    actionPage(options) {
      const page = options.page;
      if (options.options) {
        options = {
          ...Espo.Utils.parseUrlOptionsParam(options.options),
          ...options
        };
        delete options.options;
      }
      if (!page) {
        throw new Error();
      }
      const methodName = 'action' + Espo.Utils.upperCaseFirst(page);
      if (this[methodName]) {
        this[methodName](options);
        return;
      }
      const defs = this.getPageDefs(page);
      if (!defs) {
        throw new Espo.Exceptions.NotFound();
      }
      if (defs.view) {
        this.main(defs.view, options);
        return;
      }
      if (!defs.recordView) {
        throw new Espo.Exceptions.NotFound();
      }
      const model = this.getSettingsModel();
      model.fetch().then(() => {
        model.id = '1';
        const editView = new _edit.default({
          model: model,
          headerTemplate: 'admin/settings/headers/page',
          recordView: defs.recordView,
          page: page,
          label: defs.label,
          optionsToPass: ['page', 'label']
        });
        this.main(editView);
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionIndex(options) {
      let isReturn = options.isReturn;
      const key = 'index';
      if (this.getRouter().backProcessed) {
        isReturn = true;
      }
      if (!isReturn && this.getStoredMainView(key)) {
        this.clearStoredMainView(key);
      }
      const view = new _index.default();
      this.main(view, null, view => {
        view.render();
        this.listenTo(view, 'clear-cache', this.clearCache);
        this.listenTo(view, 'rebuild', this.rebuild);
      }, {
        useStored: isReturn,
        key: key
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionUsers() {
      this.getRouter().dispatch('User', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionPortalUsers() {
      this.getRouter().dispatch('PortalUser', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionApiUsers() {
      this.getRouter().dispatch('ApiUser', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionTeams() {
      this.getRouter().dispatch('Team', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionRoles() {
      this.getRouter().dispatch('Role', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionPortalRoles() {
      this.getRouter().dispatch('PortalRole', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionPortals() {
      this.getRouter().dispatch('Portal', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionLeadCapture() {
      this.getRouter().dispatch('LeadCapture', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionEmailFilters() {
      this.getRouter().dispatch('EmailFilter', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionGroupEmailFolders() {
      this.getRouter().dispatch('GroupEmailFolder', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionEmailTemplates() {
      this.getRouter().dispatch('EmailTemplate', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionPdfTemplates() {
      this.getRouter().dispatch('Template', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionDashboardTemplates() {
      this.getRouter().dispatch('DashboardTemplate', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionWebhooks() {
      this.getRouter().dispatch('Webhook', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionLayoutSets() {
      this.getRouter().dispatch('LayoutSet', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionWorkingTimeCalendar() {
      this.getRouter().dispatch('WorkingTimeCalendar', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionAttachments() {
      this.getRouter().dispatch('Attachment', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionAuthenticationProviders() {
      this.getRouter().dispatch('AuthenticationProvider', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionAddressCountries() {
      this.getRouter().dispatch('AddressCountry', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionEmailAddresses() {
      this.getRouter().dispatch('EmailAddress', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionPhoneNumbers() {
      this.getRouter().dispatch('PhoneNumber', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionPersonalEmailAccounts() {
      this.getRouter().dispatch('EmailAccount', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionGroupEmailAccounts() {
      this.getRouter().dispatch('InboundEmail', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionActionHistory() {
      this.getRouter().dispatch('ActionHistoryRecord', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionImport() {
      this.getRouter().dispatch('Import', 'index', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionLayouts(options) {
      const scope = options.scope || null;
      const type = options.type || null;
      const em = options.em || false;
      this.main('views/admin/layouts/index', {
        scope: scope,
        type: type,
        em: em
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionLabelManager(options) {
      const scope = options.scope || null;
      const language = options.language || null;
      this.main('views/admin/label-manager/index', {
        scope: scope,
        language: language
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionTemplateManager(options) {
      const name = options.name || null;
      this.main('views/admin/template-manager/index', {
        name: name
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionFieldManager(options) {
      const scope = options.scope || null;
      const field = options.field || null;
      this.main('views/admin/field-manager/index', {
        scope: scope,
        field: field
      });
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param {Record} options
     */
    actionEntityManager(options) {
      const scope = options.scope || null;
      if (scope && options.edit) {
        this.main('views/admin/entity-manager/edit', {
          scope: scope
        });
        return;
      }
      if (options.create) {
        this.main('views/admin/entity-manager/edit');
        return;
      }
      if (scope && options.formula) {
        this.main('views/admin/entity-manager/formula', {
          scope: scope,
          type: options.type
        });
        return;
      }
      if (scope) {
        this.main('views/admin/entity-manager/scope', {
          scope: scope
        });
        return;
      }
      this.main('views/admin/entity-manager/index');
    }

    // noinspection JSUnusedGlobalSymbols
    actionLinkManager(options) {
      const scope = options.scope || null;
      this.main('views/admin/link-manager/index', {
        scope: scope
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionSystemRequirements() {
      this.main('views/admin/system-requirements/index');
    }

    /**
     * @returns {module:models/settings}
     */
    getSettingsModel() {
      const model = this.getConfig().clone();
      model.defs = this.getConfig().defs;
      this.listenTo(model, 'after:save', () => {
        this.getConfig().load();
        this._broadcastChannel.postMessage('update:config');
      });

      // noinspection JSValidateTypes
      return model;
    }

    // noinspection JSUnusedGlobalSymbols
    actionAuthTokens() {
      this.collectionFactory.create('AuthToken', collection => {
        const searchManager = new _searchManager.default(collection, 'list', this.getStorage(), this.getDateTime());
        searchManager.loadStored();
        collection.where = searchManager.getWhere();
        collection.maxSize = this.getConfig().get('recordsPerPage') || collection.maxSize;
        this.main('views/admin/auth-token/list', {
          scope: 'AuthToken',
          collection: collection,
          searchManager: searchManager
        });
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionAuthLog() {
      this.collectionFactory.create('AuthLogRecord', collection => {
        const searchManager = new _searchManager.default(collection, 'list', this.getStorage(), this.getDateTime());
        searchManager.loadStored();
        collection.where = searchManager.getWhere();
        collection.maxSize = this.getConfig().get('recordsPerPage') || collection.maxSize;
        this.main('views/admin/auth-log-record/list', {
          scope: 'AuthLogRecord',
          collection: collection,
          searchManager: searchManager
        });
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionAppSecrets() {
      this.getRouter().dispatch('AppSecret', 'list', {
        fromAdmin: true
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionJobs() {
      this.collectionFactory.create('Job', collection => {
        const searchManager = new _searchManager.default(collection, 'list', this.getStorage(), this.getDateTime());
        searchManager.loadStored();
        collection.where = searchManager.getWhere();
        collection.maxSize = this.getConfig().get('recordsPerPage') || collection.maxSize;
        this.main('views/admin/job/list', {
          scope: 'Job',
          collection: collection,
          searchManager: searchManager
        });
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionAppLog() {
      this.collectionFactory.create('AppLogRecord', collection => {
        const searchManager = new _searchManager.default(collection, 'list', this.getStorage(), this.getDateTime());
        searchManager.loadStored();
        collection.where = searchManager.getWhere();
        collection.maxSize = this.getConfig().get('recordsPerPage') || collection.maxSize;
        this.main('views/list', {
          scope: 'AppLogRecord',
          collection: collection,
          searchManager: searchManager
        });
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionIntegrations(options) {
      const integration = options.name || null;
      this.main('views/admin/integrations/index', {
        integration: integration
      });
    }

    // noinspection JSUnusedGlobalSymbols
    actionExtensions() {
      this.main('views/admin/extensions/index');
    }
    rebuild() {
      if (this.rebuildRunning) {
        return;
      }
      this.rebuildRunning = true;
      const master = this.get('master');
      Espo.Ui.notify(master.translate('pleaseWait', 'messages'));
      Espo.Ajax.postRequest('Admin/rebuild').then(() => {
        const msg = master.translate('Rebuild has been done', 'labels', 'Admin');
        Espo.Ui.success(msg);
        this.rebuildRunning = false;
      }).catch(() => {
        this.rebuildRunning = false;
      });
    }
    clearCache() {
      if (this.clearCacheRunning) {
        return;
      }
      this.clearCacheRunning = true;
      const master = this.get('master');
      Espo.Ui.notify(master.translate('pleaseWait', 'messages'));
      Espo.Ajax.postRequest('Admin/clearCache').then(() => {
        const msg = master.translate('Cache has been cleared', 'labels', 'Admin');
        Espo.Ui.success(msg);
        this.clearCacheRunning = false;
      }).catch(() => {
        this.clearCacheRunning = false;
      });
    }

    /**
     * @returns {Object|null}
     */
    getPageDefs(page) {
      const panelsDefs = this.getMetadata().get(['app', 'adminPanel']) || {};
      let resultDefs = null;
      for (const panelKey in panelsDefs) {
        const itemList = panelsDefs[panelKey].itemList || [];
        for (const defs of itemList) {
          if (defs.url === '#Admin/' + page) {
            resultDefs = defs;
            break;
          }
        }
        if (resultDefs) {
          break;
        }
      }
      return resultDefs;
    }
  }
  var _default = _exports.default = AdminController;
});

