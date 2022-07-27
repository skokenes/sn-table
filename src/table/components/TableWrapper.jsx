import PropTypes from 'prop-types';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Table from '@mui/material/Table';

import AnnounceElements from './AnnounceElements';
import TableBodyWrapper from './TableBodyWrapper';
import TableHeadWrapper from './TableHeadWrapper';
import TableTotals from './TableTotals';
import FooterWrapper from './FooterWrapper';
import { useContextSelector, TableContext } from '../context';
import { StyledTableContainer, StyledTableWrapper } from '../styles';

import PaginationContent from './PaginationContent';
import useDidUpdateEffect from '../hooks/use-did-update-effect';
import useFocusListener from '../hooks/use-focus-listener';
import useScrollListener from '../hooks/use-scroll-listener';
import { handleTableWrapperKeyDown } from '../utils/handle-key-press';
import { updateFocus, handleResetFocus, getCellElement } from '../utils/handle-accessibility';
import { handleNavigateTop } from '../utils/handle-scroll';
import useVirtualizer from '../hooks/use-virtualizer';

export default function TableWrapper(props) {
  const {
    rootElement,
    tableData,
    pageInfo,
    setPageInfo,
    constraints,
    translator,
    selectionsAPI,
    theme,
    keyboard,
    direction,
    footerContainer,
    announce,
    model,
  } = props;
  const { totalColumnCount, totalRowCount, totalPages, paginationNeeded, rows, columns } = tableData;
  const { page, rowsPerPage } = pageInfo;
  const isSelectionMode = selectionsAPI.isModal();
  const focusedCellCoord = useContextSelector(TableContext, (value) => value.focusedCellCoord);
  const setFocusedCellCoord = useContextSelector(TableContext, (value) => value.setFocusedCellCoord);
  const shouldRefocus = useRef(false);
  const tableContainerRef = useRef();
  const tableWrapperRef = useRef();

  const setShouldRefocus = useCallback(() => {
    shouldRefocus.current = rootElement.getElementsByTagName('table')[0].contains(document.activeElement);
  }, [rootElement]);

  const handleChangePage = useCallback(
    (pageIdx) => {
      setPageInfo({ ...pageInfo, page: pageIdx });
      announce({
        keys: [['SNTable.Pagination.PageStatusReport', (pageIdx + 1).toString(), totalPages.toString()]],
        politeness: 'assertive',
      });
    },
    [pageInfo, setPageInfo, totalPages, announce]
  );

  const handleKeyDown = (evt) => {
    handleTableWrapperKeyDown({
      evt,
      totalRowCount,
      page,
      rowsPerPage,
      handleChangePage,
      setShouldRefocus,
      keyboard,
      isSelectionMode,
    });
  };

  useFocusListener(tableWrapperRef, shouldRefocus, keyboard);
  useScrollListener(tableContainerRef, direction);

  useEffect(
    () => handleNavigateTop({ tableContainerRef, focusedCellCoord, rootElement }),
    [tableContainerRef, focusedCellCoord, rootElement]
  );

  useDidUpdateEffect(() => {
    // When nebula handles keyboard navigation and keyboard.active changes,
    // make sure to blur or focus the cell corresponding to focusedCellCoord
    // when keyboard.focus() runs, keyboard.active is true
    // when keyboard.blur() runs, keyboard.active is false
    updateFocus({ focusType: keyboard.active ? 'focus' : 'blur', cell: getCellElement(rootElement, focusedCellCoord) });
  }, [keyboard.active]);

  // Except for first render, whenever the size of the data (number of rows per page, rows, columns) or page changes,
  // reset tabindex to first cell. If some cell had focus, focus the first cell as well.
  useDidUpdateEffect(() => {
    handleResetFocus({
      focusedCellCoord,
      rootElement,
      shouldRefocus,
      setFocusedCellCoord,
      isSelectionMode,
      keyboard,
      announce,
    });
  }, [rows.length, totalRowCount, totalColumnCount, page]);

  const tableAriaLabel = `${translator.get('SNTable.Accessibility.RowsAndColumns', [
    rows.length + 1,
    columns.length,
  ])} ${translator.get('SNTable.Accessibility.NavigationInstructions')}`;

  /**
   * TODO
   * - refetch data when layout changes
   * - 20M row ex: dragging scrollbar to the end doesnt quite work. mousewheel works
   * - 20M row ex: arrow down/up not going row by row: issue with losing focus
   * - 20M row ex: keydown on first row moving 2 rows down
   */
  const FIXED_HEADER_HEIGHT = 0;
  const v = useVirtualizer({
    rowCt: totalRowCount,
    rowHeight: 32,
    parentRef: tableContainerRef,
  });

  const items = v.getItemsInView();

  const itemStart = items.at(0)?.index ?? 0;
  const itemEnd = items.at(-1)?.index ?? itemStart + 1;

  const FETCH_SIZE = 100;
  const [fetchingRange, setFetchingRange] = useState([0, 0]);

  const fetchStart = fetchingRange[0];
  const fetchEnd = fetchingRange[1];
  const isItemStartInRange = itemStart >= fetchStart && itemStart <= fetchEnd;
  const isItemEndInRange = itemEnd >= fetchStart && itemEnd <= fetchEnd;
  const isFetchingCorrectRange = isItemStartInRange && isItemEndInRange;

  let newFetchRange = fetchingRange;
  if (!isFetchingCorrectRange) {
    // determine new fetch range
    // set new fetch range
    const itemRange = itemEnd - itemStart;
    const localFetchSize = Math.max(FETCH_SIZE, itemRange);
    const buffer = localFetchSize - itemRange;
    const bufferPerSide = Math.floor(buffer / 2);
    // const hasEnoughBufferO
    // TODO: work out how to handle the scenario of starting row buffer and ending row buffer offsets
    const bufferStartPos = Math.max(itemStart - bufferPerSide, 0);
    const bufferStartSize = itemStart - bufferStartPos;
    const bufferEndSize = buffer - bufferStartSize;
    const bufferEndPos = itemEnd + bufferEndSize;
    newFetchRange = [bufferStartPos, bufferStartPos + localFetchSize];
  }

  const [nextFetchStart, nextFetchEnd] = newFetchRange;
  const [data, setData] = useState([]);

  useEffect(() => {
    let cancelled = false;

    setFetchingRange([nextFetchStart, nextFetchEnd]);

    model
      .getHyperCubeData('/qHyperCubeDef', [
        { qTop: nextFetchStart, qLeft: 0, qHeight: nextFetchEnd - nextFetchStart, qWidth: totalColumnCount },
      ])
      .then((dataPages) => {
        if (!cancelled) {
          const newRows = dataPages[0].qMatrix.map((r, rowIdx) => {
            const fullRowIdx = rowIdx + nextFetchStart;
            const row = { key: `row-${fullRowIdx}`, fullRowIdx };
            columns.forEach((c, colIdx) => {
              row[c.id] = {
                ...r[colIdx],
                rowIdx: fullRowIdx,
                colIdx, // columnOrder[colIdx],
                isSelectable: c.isDim && !c.isLocked,
                rawRowIdx: rowIdx,
                rawColIdx: colIdx,
                prevQElemNumber: dataPages[0].qMatrix[rowIdx - 1]?.[colIdx]?.qElemNumber,
                nextQElemNumber: dataPages[0].qMatrix[rowIdx + 1]?.[colIdx]?.qElemNumber,
              };
            });
            return row;
          });
          setData(newRows);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [nextFetchStart, nextFetchEnd, totalColumnCount]);

  return (
    <StyledTableWrapper
      ref={tableWrapperRef}
      tableTheme={theme.table}
      paginationNeeded={paginationNeeded}
      dir={direction}
      onKeyDown={handleKeyDown}
    >
      <AnnounceElements />
      <StyledTableContainer
        ref={tableContainerRef}
        fullHeight={footerContainer || constraints.active || !paginationNeeded} // the footerContainer always wants height: 100%
        constraints={constraints}
        tabIndex={-1}
        role="application"
        data-testid="table-container"
      >
        <Table
          stickyHeader
          aria-label={tableAriaLabel}
          sx={{
            width: '100%',
            position: 'sticky',
            top: 0,
          }}
        >
          <TableHeadWrapper {...props} />
          <TableBodyWrapper
            {...props}
            setShouldRefocus={setShouldRefocus}
            tableWrapperRef={tableWrapperRef}
            items={v.getItemsInView()}
            data={data}
          >
            <TableTotals {...props} />
          </TableBodyWrapper>
        </Table>
        <div style={{ height: v.totalHeight - FIXED_HEADER_HEIGHT - v.virtualItemsHeight }}></div>
      </StyledTableContainer>
      {!constraints.active && (
        <FooterWrapper theme={theme} footerContainer={footerContainer}>
          <PaginationContent {...props} handleChangePage={handleChangePage} isSelectionMode={selectionsAPI.isModal()} />
        </FooterWrapper>
      )}
    </StyledTableWrapper>
  );
}

TableWrapper.defaultProps = {
  direction: null,
  footerContainer: null,
};

TableWrapper.propTypes = {
  rootElement: PropTypes.object.isRequired,
  tableData: PropTypes.object.isRequired,
  pageInfo: PropTypes.object.isRequired,
  setPageInfo: PropTypes.func.isRequired,
  translator: PropTypes.object.isRequired,
  constraints: PropTypes.object.isRequired,
  selectionsAPI: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
  keyboard: PropTypes.object.isRequired,
  announce: PropTypes.func.isRequired,
  footerContainer: PropTypes.object,
  direction: PropTypes.string,
  model: PropTypes.object.isRequired,
};
