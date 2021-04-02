import React, {useCallback, useState, useMemo, ReactNode} from 'react';
import {View, Text, Picker} from '@tarojs/components';

export interface ToolsProps {
  className?: string;
  show: boolean;
  loading: boolean;
  curPage: [number, number] | number;
  totalPages: number;
  onTurning: (page?: number) => void;
  children?: ReactNode;
}

function countPageList(totalPages: number, curPageNum: number, stack: number) {
  if (stack >= totalPages) {
    return new Array(totalPages).fill('').map((v, i) => i + 1);
  }
  const half = Math.floor(stack / 2);
  let start = curPageNum - half;
  const end = curPageNum + half;
  if (start < 0) {
    start = 0;
  } else if (end > totalPages) {
    start = start + totalPages - end;
  }

  return new Array(stack).fill('').map((v, i) => start + i + 1);
}

const Component: React.FC<ToolsProps> = ({show, loading, curPage, totalPages, onTurning, className, children}) => {
  const [active, setActive] = useState(false);

  const switchActive = useCallback(() => {
    setActive(!active);
  }, [active]);

  const onTurningToStart = useCallback(() => {
    onTurning(1);
  }, [onTurning]);

  const onTurningToEnd = useCallback(() => {
    onTurning(totalPages);
  }, [onTurning, totalPages]);

  const onRefresh = useCallback(() => {
    onTurning();
  }, [onTurning]);

  const onPageChange = useCallback(
    (e) => {
      onTurning(parseInt(e.target.value, 10));
    },
    [onTurning]
  );

  // eslint-disable-next-line no-nested-ternary
  const state = active ? 'on' : show ? 'show' : 'hide';
  const curPageStr = typeof curPage === 'number' ? `${curPage}` : curPage.join('-');
  const curPageNum = parseInt(curPageStr, 10);

  const PageOptions = useMemo(() => {
    return countPageList(totalPages, curPageNum, 50).map((val) => (
      <option key={val} value={val}>
        {val}
      </option>
    ));
  }, [curPageNum, totalPages]);

  return (
    <View className={`ppscroll-tools ${className || ''} ${state} ${loading ? 'loading' : ''}`}>
      <View className="wrap">
        {children ? (
          <View className="panel">{children}</View>
        ) : (
          <View className="panel">
            <View className="refresh ppscroll-icon ppscroll-icon-reload" onClick={onRefresh} />
            <View className="pagination ppscroll-icon ppscroll-icon-backward" onClick={onTurningToStart} />
            <View className="goto">
              <Text className="cur">{curPageStr}</Text> / {totalPages}
              <select className="selector" onChange={onPageChange} value={curPageNum}>
                {PageOptions}
              </select>
            </View>
            <View className="pagination ppscroll-icon ppscroll-icon-forward" onClick={onTurningToEnd} />
          </View>
        )}
      </View>
      <View className="trigger ppscroll-icon ppscroll-icon-colum-height" onClick={switchActive} />
    </View>
  );
};

export default React.memo(Component);
