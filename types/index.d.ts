import React, { ReactNode, RefObject, PureComponent } from 'react';
export interface Datasource<T = any> {
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
    datasource: Datasource<T>;
    onScroll?: (scrollTop: number, direction: '' | 'up' | 'down', curDatasource: Datasource<T>) => void;
    onTurning: (page: [number, number] | number, sid: number) => void;
    onDatasourceChange?: (datasource: Datasource<T>, scrollTop: number) => void;
    children: (list: T[]) => ReactNode;
    tools?: (curPage: [number, number] | number, totalPages: number, totalItems: number, show: boolean, loading: boolean, onTurning: (page?: number) => void) => ReactNode;
    topArea?: (morePage: boolean, prevPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode;
    bottomArea?: (morePage: boolean, nextPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode;
    timeout?: number;
}
interface State<T = any> extends Required<Datasource<T>> {
    datasource: Datasource<T> | null;
    cacheDatasource: Datasource<T> | null;
    sourceCache: {
        [page: number]: Datasource<T>;
    };
    lockState: State<T> | null;
    actionState: '' | 'next' | 'prev' | 'prev-reclaiming' | 'next-reclaiming';
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
    scrollState: '' | 'up' | 'down';
    scrollTimer: number;
    toolsTimer: number;
    reclaiming?: () => void;
    listData: T[];
    prevPageNum: [number, number] | number;
    curDatasource?: Datasource;
    memoList: (render: (list: any) => ReactNode, list: any[]) => React.ReactNode;
    memoTools: (render: (curPage: [number, number] | number, totalPages: number, totalItems: number, show: boolean, loading: boolean, onTurning: (page?: number | undefined) => void) => ReactNode, curPage: [number, number] | number, totalPages: number, totalItems: number, show: boolean, loading: boolean, onTurning: (page?: number | undefined) => void) => React.ReactNode;
    memoTopArea: (render: (morePage: boolean, prevPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode, morePage: boolean, prevPage: number, loading: boolean, errorCode: string, retry: () => void) => React.ReactNode;
    memoBottomArea: (render: (morePage: boolean, nextPage: number, loading: boolean, errorCode: string, retry: () => void) => ReactNode, morePage: boolean, nextPage: number, loading: boolean, errorCode: string, retry: () => void) => React.ReactNode;
    memoDatasource: (callback: (datasource: Datasource<T>) => void, list: T[], page: [number, number] | number, totalPages: number, totalItems: number, firstSize?: number | undefined) => Datasource<T>;
    memoShowTools: (switchTools: (show: boolean) => void, show: boolean) => void;
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
    onDatasourceChange: (datasource: Datasource<T>) => void;
    onScrollTopChange: (scrollTop: number, direction: '' | 'up' | 'down') => void;
    defaultTools: (curPage: [number, number] | number, totalPages: number, totalItems: number, show: boolean, loading: boolean, onTurning: (page?: number | undefined) => void) => JSX.Element;
    switchTools: (showTools: boolean) => void;
    render(): JSX.Element;
}
export default Component;
