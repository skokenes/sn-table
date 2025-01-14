import React from 'react';
import PropTypes from 'prop-types';

export default function withStyling(CellComponent) {
  const HOC = (props) => {
    const { styling, ...passThroughProps } = props;

    return (
      <CellComponent {...passThroughProps} className={`${styling.selectedCellClass} sn-table-cell`} style={styling} />
    );
  };

  HOC.propTypes = {
    styling: PropTypes.object.isRequired,
  };

  return HOC;
}
