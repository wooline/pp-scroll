import React, { ReactNode, RefObject, PureComponent } from 'react';
export interface DataSource<T = any> {
    sid: number;
    list: T[];
    page: [number, number] | number;
    totalPages: number;
    totalItems: number;
    scrollTop?: number;
    firstSize?: number;
    errorCode?: string;
}
interface Props<T = any> {
    className?: string;
    datasource: DataSource<T>;
    onScroll?: (scrollTop: number, scrollState: '' | 'up' | 'down') => void;
    onTurning: (page: [number, number] | number, sid: number) => void;
    onDatasourceChange?: (datasource: DataSource<T>) => void;
    children: (list: T[]) => ReactNode;
    tools?: (curPage: [number, number] | number, totalPages: number, totalItems: number, show: boolean, loading: boolean, onTurning: (page?: number) => void) => ReactNode;
    topArea?: (morePage: boolean, prevPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode;
    bottomArea?: (morePage: boolean, nextPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode;
    timeout?: number;
}
interface State<T = any> extends Required<DataSource<T>> {
    datasource: DataSource<T> | null;
    cacheDatasource: DataSource<T> | null;
    sourceCache: {
        [page: number]: DataSource<T>;
    };
    lockState: State<T> | null;
    actionState: '' | 'next' | 'prev' | 'prev-reclaiming' | 'next-reclaiming';
    scrollState: '' | 'up' | 'down';
    loadingState: number;
    errorCode: string;
    showTools: boolean;
}
declare class Component<T> extends PureComponent<Props<T>, State<T>> {
    static getDerivedStateFromProps(nextProps: Props, prevState: State): Partial<State> | null;
    state: State;
    listRef: RefObject<any>;
    curScrollTop: number;
    prevScrollTop: number;
    scrollTimer: number;
    toolsTimer: number;
    reclaiming?: () => void;
    listData: T[];
    prevPageNum: [number, number] | number;
    memoList: (render: (list: any) => ReactNode, list: any[]) => React.ReactNode;
    memoTools: (render: (curPage: [number, number] | number, totalPages: number, totalItems: number, show: boolean, loading: boolean, onTurning: (page?: number | undefined) => void) => ReactNode, curPage: [number, number] | number, totalPages: number, totalItems: number, show: boolean, loading: boolean, onTurning: (page?: number | undefined) => void) => React.ReactNode;
    memoTopArea: (render: (morePage: boolean, prevPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode, morePage: boolean, prevPage: number, loading: boolean, errorCode: string, retry: () => void) => React.ReactNode;
    memoBottomArea: (render: (morePage: boolean, nextPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode, morePage: boolean, nextPage: number, loading: boolean, errorCode: string, retry: () => void) => React.ReactNode;
    memoDatasource: (callback: (datasource: DataSource<T>) => void, sid: number, list: T[], page: [number, number] | number, totalPages: number, totalItems: number, scrollTop: number, firstSize?: number | undefined, errorCode?: string | undefined) => DataSource<T>;
    memoShowTools: (switchTools: (show: boolean) => void, show: boolean) => boolean;
    constructor(props: any);
    getSnapshotBeforeUpdate(prevProps: Props, prevState: State): any[] | null;
    componentDidUpdate(prevProps: Props, prevState: State, snapshot: [number, number]): void;
    onScrollToLower: () => void;
    onScrollToUpper: () => void;
    checkScroll: () => void;
    onScroll: (e: any) => void;
    onTurning: (page: [number, number] | number, sid: number) => void;
    onToolsTurning: (page?: number | undefined) => void;
    onRetryToPrev: () => void;
    onRetryToNext: () => void;
    defaultTools: (curPage: [number, number] | number, totalPages: number, totalItems: number, show: boolean, loading: boolean, onTurning: (page?: number | undefined) => void) => JSX.Element;
    switchTools: (showTools: boolean) => void;
    render(): JSX.Element;
}
export default Component;
