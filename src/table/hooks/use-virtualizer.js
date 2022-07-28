import { useEffect, useState, useRef } from 'react';
import { getCellElement, updateFocus } from '../utils/handle-accessibility';

/**
 * could we merge virtual scroll with "infinite scroll",
 * where the scroll area resets based on paging?
 * basically, can fit X rows in view. if you scroll to end of X and there
 * are more rows to show, reset the scroll area, moving the scroll back up
 */

const checkIsVisible = function (ele, container) {
  const { bottom, height, top } = ele.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const isTopVisible = top >= containerRect.top && top < containerRect.bottom;
  const isBottomVisible = bottom > containerRect.top && bottom <= containerRect.bottom;
  return isTopVisible && isBottomVisible;
};

const MAX_HEIGHT = 1e6;

export default function useVirtualizer({ rowCt, rowHeight, parentRef, paddingTop = 0, focusedCellCoord }) {
  const [s, setS] = useState();
  const node = parentRef.current;
  const height = (node && node.getBoundingClientRect()?.height) ?? 0;
  const [fractionalScrollPos, setFractionalScrollPos] = useState(0);

  // TODO: these refs. others needed like height or node height? those can be stateful?
  const rowHeightRef = useRef(rowHeight);
  rowHeightRef.current = rowHeight;

  const fractionalScrollPosRef = useRef(fractionalScrollPos);
  fractionalScrollPosRef.current = fractionalScrollPos;

  const [scrollPos, setScrollPos] = useState(0);

  const ignoreScrollEventRef = useRef(false);

  useEffect(() => {
    // TODO Currently forces rerender to get node ref. Way to improve this? Will this always work?
    if (!node) {
      setTimeout(() => {
        setS(true);
      });
    } else {
      // let ignoreScrollEvent = false;

      const clamp = (min, max, v) => {
        return Math.max(min, Math.min(max, v));
      };

      // Better way to calculate this? Use max index?
      // const maxIndex = rowCt - itemsInView;
      const getMaxPos = () => node.scrollHeight - node.offsetHeight;

      const clampSize = (nextSize) => {
        const minPos = 0;

        const maxPos = getMaxPos();
        return clamp(minPos, maxPos, nextSize);
      };

      const isAtMaxPos = () => {
        return node.scrollTop === getMaxPos() && fractionalScrollPosRef.current === getMaxPos();
      };

      // eslint-disable-next-line no-inner-declarations
      function updateScroll(evt, ratio = 1) {
        // return;
        // maybe some options for whether we want to change focus or not? so we can control whether mouse should do that or just keys
        const stepSize = (Math.round((rowHeightRef.current / virtualRatioRef.current) * 100) / 100) * ratio;
        const currentFractionalSize = fractionalScrollPosRef.current;
        const prevScrollTop = node.scrollTop;
        const nextSize = clampSize(Math.round((currentFractionalSize + stepSize) * 100) / 100);

        const currentFocus = document.activeElement;

        /**
         * some other options here...
         * - if focused element is going out of DOM, move focus to the table container?
         *    - how would this affect accessibility?
         */

        if (ratio === 1) {
          // If the target is a row or inside of a row, move the focus down one?
          // Maybe only if it is about to go off screen, although thats not detectable from here yet
          if (currentFocus.classList.contains('sn-table-row')) {
            const maybeNextRow = currentFocus.nextSibling;
            if (maybeNextRow) maybeNextRow.focus();
          }
        } else if (ratio === -1) {
          if (currentFocus.classList.contains('sn-table-row')) {
            const maybePrevRow = currentFocus.previousSibling;
            if (maybePrevRow) maybePrevRow.focus();
          }
        }

        node.scrollTop = nextSize;
        setFractionalScrollPos(nextSize);
        setScrollPos(node.scrollTop);

        if (node.scrollTop !== prevScrollTop) {
          ignoreScrollEventRef.current = true;
        }
      }

      window.addEventListener('keydown', (evt) => {
        // Ignore scroll event if the target is not inside the container ref?
        if (evt.key === 'ArrowDown') {
          // evt.preventDefault();
        }
      });

      const keydownListener = (evt) => {
        if (evt.key === 'ArrowDown') {
          // evt.preventDefault();
          // updateScroll(evt);
        }
        if (evt.key === 'ArrowUp') {
          // evt.preventDefault();
          /**
           * If at max scroll pos and user hits "ArrowUp",
           * increment back an extra row to handle off by 1 issue
           */
          // const incrementRatio = isAtMaxPos() ? -2 : -1;
          // updateScroll(evt, incrementRatio);
        }
      };

      node.addEventListener('keydown', keydownListener);

      const wheelListener = (evt) => {
        evt.preventDefault();
        updateScroll(evt, evt.deltaY / 8);
      };

      node.addEventListener('wheel', wheelListener);

      const scrollListener = (evt) => {
        if (ignoreScrollEventRef.current) {
          ignoreScrollEventRef.current = false;
          return;
        }
        const adjustedSize = clampSize(node.scrollTop);
        node.scrollTop = adjustedSize;
        setScrollPos(adjustedSize);
        setFractionalScrollPos(adjustedSize);
      };

      // Scroll handler
      node.addEventListener('scroll', scrollListener);

      return () => {
        node.removeEventListener('keydown', keydownListener);
        node.removeEventListener('wheel', wheelListener);
        node.removeEventListener('scroll', scrollListener);
      };
    }
  }, [node]);

  const availableHeight = height - paddingTop;

  const itemsInView = Math.min(rowCt, Math.ceil(availableHeight / rowHeight));
  const maxItemsFullyInView = Math.min(rowCt, Math.max(0, Math.floor(availableHeight / rowHeight)));
  const virtualItemsHeight = rowHeight * itemsInView;
  const totalHeight = Math.min(rowCt * rowHeight, MAX_HEIGHT);

  const topSpacing = scrollPos;
  const bottomSpacing = totalHeight - virtualItemsHeight - scrollPos;

  const scrollHeight = node?.scrollHeight ?? 1;
  // const scrollIndex = Math.ceil(
  //   Math.min(1, fractionalScrollPos / (scrollHeight - height)) *
  //     (rowCt - itemsInView)
  // );
  const maybeScrollIndex = Math.ceil(
    Math.min(1, fractionalScrollPos / (scrollHeight - height)) * (rowCt - maxItemsFullyInView)
  );
  const scrollIndex = Number.isNaN(maybeScrollIndex) ? 0 : maybeScrollIndex;

  const heightNeeded = rowCt * rowHeight;
  const virtualRatio = heightNeeded / totalHeight;
  const virtualRatioRef = useRef();
  virtualRatioRef.current = virtualRatio;

  const getItemsInView = () => {
    const items = new Array(maxItemsFullyInView) // new Array(itemsInView)
      .fill(scrollIndex)
      .map((s, i) => ({
        index: s + i,
      }))
      .filter((i) => i.index < rowCt);
    return items;
  };

  useEffect(() => {
    const headerSize = 2;
    const currentRow = focusedCellCoord[0] - headerSize;
    if (currentRow < 0) return;

    // edge case: if new focused idx is not even in DOM anywhere, we need to scroll to that position
    const maybeCell = getCellElement(parentRef.current, focusedCellCoord);

    // if the cell exists but is not the focused element, fix that
    if (maybeCell && maybeCell !== document.activeElement) {
      updateFocus({ focusType: 'focus', cell: maybeCell });
    }

    let desiredScrollIndex = null;
    if (!maybeCell) {
      desiredScrollIndex = currentRow;
    } else if (maybeCell && !checkIsVisible(maybeCell, parentRef.current)) {
      desiredScrollIndex = currentRow;
    }

    // const visibleRange = [scrollIndex, scrollIndex + maxItemsFullyInView];
    // const isVisible = checkIsVisible(document.activeElement, parentRef.current); // currentRow >= visibleRange[0] && currentRow <= visibleRange[1];
    // console.log('IS VISIBLE', isVisible);
    // console.log({ focusedCellCoord, currentRow });
    // If currentRow is not in the view, calculate the necessary new scroll pos and set it.
    // would this just be fractional? or actual scrollpos too? node.scrollTop?
    // For now, just move to top. Later, determine smarter way to do top vs. bottom or other placement
    if (desiredScrollIndex !== null) {
      // const desiredScrollIndex = currentRow;
      const node = parentRef.current;
      const clamp = (min, max, v) => {
        return Math.max(min, Math.min(max, v));
      };

      // Better way to calculate this? Use max index?
      // const maxIndex = rowCt - itemsInView;
      const getMaxPos = () => node.scrollHeight - node.offsetHeight;

      const clampSize = (nextSize) => {
        const minPos = 0;

        const maxPos = getMaxPos();
        return clamp(minPos, maxPos, nextSize);
      };

      const stepSize = (Math.round((rowHeightRef.current / virtualRatioRef.current) * 100) / 100) * desiredScrollIndex;

      // const currentFractionalSize = fractionalScrollPosRef.current;
      const prevScrollTop = node.scrollTop;
      const nextSize = clampSize(Math.round(stepSize * 100) / 100);
      // console.log({ desiredScrollIndex, stepSize, nextSize });
      // setFractionalScrollPos(stepSize);

      node.scrollTop = nextSize;
      setFractionalScrollPos(nextSize);
      setScrollPos(node.scrollTop);

      if (node.scrollTop !== prevScrollTop) {
        ignoreScrollEventRef.current = true;
      }
    }
  }, [focusedCellCoord, scrollIndex, maxItemsFullyInView]);

  return {
    getItemsInView,
    totalHeight,
    virtualItemsHeight,
    topSpacing,
    bottomSpacing,
  };
}
