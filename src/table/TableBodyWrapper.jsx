import React, { useReducer, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import { addSelectionListeners, reducer } from './selections-utils';
import getCellRenderer from './cells/renderer';
import { getBodyStyle } from './styling-utils';
import handleKeyPress, { handleKeyUp } from './cells/handle-key-press';

const useStyles = makeStyles({
  hoverTableRow: {
    '&&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0)',
      '& td:not(.selected)': {
        backgroundColor: ({ hoverBackgroundColor }) => hoverBackgroundColor,
        color: ({ hoverFontColor }) => hoverFontColor,
      },
    },
  },
});

const TableBodyWrapper = ({ rootElement, tableData, constraints, selectionsAPI, layout, theme }) => {
  const { rows, columns } = tableData;
  const hoverEffect = layout.components?.[0]?.content?.hoverEffect;
  const styling = useMemo(() => getBodyStyle(layout, theme), [layout, theme]);
  const classes = useStyles(styling);
  const getColumnRenderers = (selectionsEnabled) =>
    tableData.columns.map((c) => getCellRenderer(!!c.stylingInfo.length, selectionsEnabled));
  const [columnRenderers, setColumnRenderers] = useState(getColumnRenderers(false));
  const [selState, selDispatch] = useReducer(reducer, {
    api: selectionsAPI,
    rows: [],
    colIdx: -1,
    isEnabled: !!selectionsAPI && !constraints.active,
  });

  useEffect(() => {
    const selectionsEnabled = !!selectionsAPI && !constraints.active;
    selDispatch({ type: 'set-enabled', payload: { isEnabled: selectionsEnabled } });
    setColumnRenderers(getColumnRenderers(selectionsEnabled));
  }, [constraints, layout]);

  useEffect(() => {
    addSelectionListeners(selectionsAPI, selDispatch);
  }, []);

  return (
    <TableBody>
      {rows.map((row, rowIndex) => (
        <TableRow
          hover={hoverEffect}
          role="checkbox"
          tabIndex={-1}
          key={row.key}
          className={`sn-table-row ${hoverEffect && classes.hoverTableRow}`}
        >
          {columns.map((column, columnIndex) => {
            const cell = row[column.id];
            const value = cell.qText;
            const CellRenderer = columnRenderers[columnIndex];
            return (
              CellRenderer && (
                <CellRenderer
                  cell={cell}
                  column={column}
                  value={value}
                  key={column.id}
                  align={column.align}
                  styling={styling}
                  selState={selState}
                  selDispatch={selDispatch}
                  tabIndex={-1}
                  onKeyDown={
                    (evt) =>
                      handleKeyPress(
                        evt,
                        rootElement,
                        rows,
                        rowIndex + 1,
                        columnIndex,
                        column.id,
                        selState,
                        selDispatch
                      )
                    // eslint-disable-next-line react/jsx-curly-newline
                  }
                  onKeyUp={(evt) => handleKeyUp(evt)}
                >
                  {value}
                </CellRenderer>
              )
            );
          })}
        </TableRow>
      ))}
    </TableBody>
  );
};

TableBodyWrapper.propTypes = {
  rootElement: PropTypes.object.isRequired,
  tableData: PropTypes.object.isRequired,
  constraints: PropTypes.object.isRequired,
  selectionsAPI: PropTypes.object.isRequired,
  layout: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
};

export default React.memo(TableBodyWrapper);
