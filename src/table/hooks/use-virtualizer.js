import { useEffect, useState, useRef } from 'react';

/**
 * could we merge virtual scroll with "infinite scroll",
 * where the scroll area resets based on paging?
 * basically, can fit X rows in view. if you scroll to end of X and there
 * are more rows to show, reset the scroll area, moving the scroll back up
 */

const MAX_HEIGHT = 1e6;

export default function useVirtualizer({ rowCt, rowHeight, parentRef, paddingTop = 0 }) {
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
  useEffect(() => {
    // TODO Currently forces rerender to get node ref. Way to improve this? Will this always work?
    if (!node) {
      setTimeout(() => {
        setS(true);
      });
    } else {
      let ignoreScrollEvent = false;

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
        const stepSize = (Math.round((rowHeightRef.current / virtualRatioRef.current) * 100) / 100) * ratio;
        const currentFractionalSize = fractionalScrollPosRef.current;
        const prevScrollTop = node.scrollTop;
        const nextSize = clampSize(Math.round((currentFractionalSize + stepSize) * 100) / 100);

        node.scrollTop = nextSize;
        setFractionalScrollPos(nextSize);
        setScrollPos(node.scrollTop);
        if (node.scrollTop !== prevScrollTop) {
          ignoreScrollEvent = true;
        }
      }

      const keydownListener = (evt) => {
        if (evt.key === 'ArrowDown') {
          evt.preventDefault();
          updateScroll(evt);
        }
        if (evt.key === 'ArrowUp') {
          evt.preventDefault();
          /**
           * If at max scroll pos and user hits "ArrowUp",
           * increment back an extra row to handle off by 1 issue
           */
          const incrementRatio = isAtMaxPos() ? -2 : -1;
          updateScroll(evt, incrementRatio);
        }
      };

      node.addEventListener('keydown', keydownListener);

      const wheelListener = (evt) => {
        evt.preventDefault();
        updateScroll(evt, evt.deltaY / 8);
      };

      node.addEventListener('wheel', wheelListener);

      const scrollListener = (evt) => {
        if (ignoreScrollEvent) {
          ignoreScrollEvent = false;
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

  return {
    getItemsInView,
    totalHeight,
    virtualItemsHeight,
    topSpacing,
    bottomSpacing,
  };
}
