const columnCommonHidden = {
  autoSort: {
    ref: 'qDef.autoSort',
    type: 'boolean',
    defaultValue: true,
    show: false,
  },
  cId: {
    ref: 'qDef.cId',
    type: 'string',
    show: false,
  },
};

const columnExpressionItems = {
  visibilityCondition: {
    type: 'string',
    component: 'expression',
    ref: 'qCalcCondition.qCond',
    expression: 'optional',
    expressionType: 'ValueExpr',
    translation: 'Object.Table.Columns.VisibilityCondition',
    defaultValue: { qv: '' },
    tid: 'visibilityCondition',
    isExpression: (val) => typeof val === 'string' && val.trim().length > 0,
  },
  tableCellColoring: {
    component: 'attribute-expression-reference',
    defaultValue: [],
    ref: 'qAttributeExpressions',
    items: [
      {
        component: 'expression',
        ref: 'qExpression',
        expressionType: 'measure',
        translation: 'Object.Table.Measure.BackgroundExpression',
        defaultValue: '',
        id: 'cellBackgroundColor',
        tid: 'tableColorBgByExpression',
      },
      {
        component: 'expression',
        ref: 'qExpression',
        expressionType: 'measure',
        translation: 'Object.Table.Measure.ForegroundExpression',
        defaultValue: '',
        id: 'cellForegroundColor',
        tid: 'tableColorByExpression',
      },
    ],
  },
};

const textAlignItems = {
  textAlignAuto: {
    ref: 'qDef.textAlign.auto',
    type: 'boolean',
    component: 'switch',
    translation: 'Common.Text.TextAlignment',
    options: [
      {
        value: true,
        translation: 'Common.Auto',
      },
      {
        value: false,
        translation: 'Common.Custom',
      },
    ],
    defaultValue: true,
  },
  textAlign: {
    ref: 'qDef.textAlign.align',
    type: 'string',
    component: 'item-selection-list',
    horizontal: true,
    items: [
      {
        component: 'icon-item',
        icon: 'align_left',
        labelPlacement: 'bottom',
        value: 'left',
        translation: 'properties.dock.left',
      },
      {
        component: 'icon-item',
        icon: 'align_center',
        labelPlacement: 'bottom',
        value: 'center',
        translation: 'Common.Center',
      },
      {
        component: 'icon-item',
        icon: 'align_right',
        labelPlacement: 'bottom',
        value: 'right',
        translation: 'properties.dock.right',
      },
    ],
    defaultValue: 'left',
    show: (data) => data.qDef.textAlign !== undefined && !data.qDef.textAlign.auto,
  },
};

const stylingSettings = {
  type: 'items',
  items: [
    {
      component: 'style-editor',
      translation: 'LayerStyleEditor.component.styling',
      subtitle: 'LayerStyleEditor.component.styling',
      resetBtnTranslation: 'LayerStyleEditor.component.resetAll',
      key: 'theme',
      ref: 'components',
      defaultValue: [], // used by chart conversion
      defaultValues: {
        // used by style editor
        key: 'theme',
        content: {
          fontSize: null,
          fontColor: {
            index: -1,
            color: null,
          },
          hoverEffect: false,
          hoverColor: {
            index: -1,
            color: null,
          },
          hoverFontColor: {
            index: -1,
            color: null,
          },
        },
        header: {
          fontSize: null,
          fontColor: {
            index: -1,
            color: null,
          },
        },
      },
      items: {
        chart: {
          type: 'items',
          items: {
            headerFontSize: {
              show: true,
              ref: 'header.fontSize',
              translation: 'ThemeStyleEditor.style.headerFontSize',
              component: 'integer',
              // placeholder: () => parseInt(styleService.getStyle('header', 'fontSize'), 10),
              maxlength: 3,
              change(data) {
                data.header.fontSize = Math.max(5, Math.min(300, Math.floor(data.header.fontSize)));
              },
            },
            headerFontColor: {
              show: true,
              ref: 'header.fontColor',
              translation: 'ThemeStyleEditor.style.headerFontColor',
              type: 'object',
              component: 'color-picker',
              dualOutput: true,
            },
            fontSize: {
              show: true,
              translation: 'ThemeStyleEditor.style.cellFontSize',
              ref: 'content.fontSize',
              component: 'integer',
              // placeholder: () => parseInt(styleService.getStyle('content', 'fontSize'), 10),
              maxlength: 3,
              change(data) {
                data.content.fontSize = Math.max(5, Math.min(300, Math.floor(data.content.fontSize)));
              },
            },
            fontColor: {
              show: true,
              ref: 'content.fontColor',
              translation: 'ThemeStyleEditor.style.cellFontColor',
              type: 'object',
              component: 'color-picker',
              dualOutput: true,
            },
            hoverEffect: {
              show: true,
              ref: 'content.hoverEffect',
              translation: 'ThemeStyleEditor.style.hoverEffect',
              type: 'boolean',
              component: 'switch',
              options: [
                {
                  value: true,
                  translation: 'properties.on',
                },
                {
                  value: false,
                  translation: 'properties.off',
                },
              ],
            },
            hoverColor: {
              show: (data) => !!data.content.hoverEffect,
              ref: 'content.hoverColor',
              translation: 'ThemeStyleEditor.style.hoverStyle',
              type: 'object',
              component: 'color-picker',
              dualOutput: true,
            },
            hoverFontColor: {
              show: (data) => !!data.content.hoverEffect,
              ref: 'content.hoverFontColor',
              translation: 'ThemeStyleEditor.style.hoverFontStyle',
              type: 'object',
              component: 'color-picker',
              dualOutput: true,
            },
          },
        },
      },
    },
  ],
};

const definition = {
  type: 'items',
  component: 'accordion',
  items: {
    data: {
      type: 'items',
      component: 'columns',
      translation: 'Common.Data',
      sortIndexRef: 'qHyperCubeDef.qColumnOrder',
      allowMove: true,
      allowAdd: true,
      addTranslation: 'Common.Columns',
      items: {
        dimensions: {
          type: 'array',
          component: 'expandable-items',
          ref: 'qHyperCubeDef.qDimensions',
          grouped: true,
          items: {
            libraryId: {
              type: 'string',
              component: 'library-item',
              libraryItemType: 'dimension',
              ref: 'qLibraryId',
              translation: 'Common.Dimension',
              show(itemData) {
                return itemData.qLibraryId;
              },
            },
            inlineDimension: {
              component: 'inline-dimension',
              show(itemData) {
                return !itemData.qLibraryId;
              },
            },
            nullSuppression: {
              type: 'boolean',
              ref: 'qNullSuppression',
              defaultValue: false,
              translation: 'properties.dimensions.showNull',
              inverted: true,
            },
            ...columnCommonHidden,
            ...columnExpressionItems,
            ...textAlignItems,
          },
        },
        measures: {
          type: 'array',
          component: 'expandable-items',
          ref: 'qHyperCubeDef.qMeasures',
          grouped: true,
          items: {
            libraryId: {
              type: 'string',
              component: 'library-item',
              libraryItemType: 'measure',
              ref: 'qLibraryId',
              translation: 'Common.Measure',
              show: (itemData) => itemData.qLibraryId,
            },
            inlineMeasure: {
              component: 'inline-measure',
              show: (itemData) => !itemData.qLibraryId,
            },
            autoSort: {
              ref: 'qDef.autoSort',
              type: 'boolean',
              defaultValue: true,
              show: false,
            },
            cId: {
              ref: 'qDef.cId',
              type: 'string',
              show: false,
            },
            ...columnCommonHidden,
            ...columnExpressionItems,
            ...textAlignItems,
          },
        },
      },
    },
    sorting: {
      uses: 'sorting',
    },
    addOns: {
      type: 'items',
      component: 'expandable-items',
      translation: 'properties.addons',
      items: {
        dataHandling: {
          uses: 'dataHandling',
          items: {
            calcCond: {
              uses: 'calcCond',
            },
          },
        },
      },
    },
    settings: {
      uses: 'settings',
      items: {
        presentation: {
          grouped: true,
          type: 'items',
          translation: 'properties.presentation',
          items: [stylingSettings],
        },
      },
    },
  },
};

export function indexAdded(array, index) {
  let i;
  for (i = 0; i < array.length; ++i) {
    if (array[i] >= 0 && array[i] >= index) {
      ++array[i];
    }
  }
  array.push(index);
}

export function indexRemoved(array, index) {
  let removeIndex = 0;
  let i;
  for (i = 0; i < array.length; ++i) {
    if (array[i] > index) {
      --array[i];
    } else if (array[i] === index) {
      removeIndex = i;
    }
  }
  array.splice(removeIndex, 1);
  return removeIndex;
}

export function min(nDimsOrMeas) {
  return nDimsOrMeas > 0 ? 0 : 1;
}

export function getDescription(env) {
  return env.translator.get('Visualizations.Descriptions.Column');
}

export default function ext(env) {
  return {
    definition,
    data: {
      measures: {
        min,
        max: 1000,
        description: () => getDescription(env),
        add(measure, data, hcHandler) {
          const { qColumnOrder, columnWidths } = hcHandler.hcProperties;
          const ix = hcHandler.getDimensions().length + hcHandler.getMeasures().length - 1;

          indexAdded(qColumnOrder, ix);

          columnWidths.splice(qColumnOrder[ix], 0, -1); // -1 is auto
        },
        remove(measure, data, hcHandler, idx) {
          const { qColumnOrder, columnWidths } = hcHandler.hcProperties;
          const columnIx = (hcHandler.hcProperties.qDimensions ? hcHandler.hcProperties.qDimensions.length : 0) + idx;
          indexRemoved(qColumnOrder, columnIx);
          columnWidths.splice(columnIx, 1);
        },
      },
      dimensions: {
        min,
        max: 1000,
        description: () => getDescription(env),
        add(dimension, data, hcHandler) {
          const { qColumnOrder, columnWidths } = hcHandler.hcProperties;
          const ix = hcHandler.getDimensions().length - 1;
          indexAdded(qColumnOrder, ix);
          columnWidths.splice(ix, 0, -1); // -1 is auto

          return dimension;
        },
        remove(dimension, data, hcHandler, idx) {
          const { qColumnOrder, columnWidths } = hcHandler.hcProperties;
          indexRemoved(qColumnOrder, idx);
          columnWidths.splice(qColumnOrder[idx], 1);
        },
      },
    },
    support: {
      export: true,
      exportData: true,
      snapshot: true,
      viewData: false,
    },
  };
}
