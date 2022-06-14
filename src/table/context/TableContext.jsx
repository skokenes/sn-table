import React, { useState, useReducer, createContext } from 'react';
import PropTypes from 'prop-types';
import { createSelectorProvider } from './createSelectorProvider';
import { reducer } from '../utils/selections-utils';

export const TableContext = createContext();

const ProviderWithSelector = createSelectorProvider(TableContext);

export const TableContextProvider = ({ children, selectionsAPI, cellCoordMock, selectionDispatchMock }) => {
  const [focusedCellCoord, setFocusedCellCoord] = useState(cellCoordMock || [0, 0]);
  const [selectionState, selectionDispatch] = useReducer(reducer, {
    rows: [],
    colIdx: -1,
    api: selectionsAPI,
  });

  return (
    <ProviderWithSelector
      value={{
        focusedCellCoord,
        setFocusedCellCoord,
        selectionState,
        selectionDispatch: selectionDispatchMock || selectionDispatch,
      }}
    >
      {children}
    </ProviderWithSelector>
  );
};

TableContextProvider.defaultProps = {
  cellCoordMock: undefined,
  selectionDispatchMock: undefined,
};

TableContextProvider.propTypes = {
  children: PropTypes.any.isRequired,
  selectionsAPI: PropTypes.object.isRequired,
  cellCoordMock: PropTypes.arrayOf(PropTypes.number),
  selectionDispatchMock: PropTypes.func,
};