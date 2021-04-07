import { ReactNode, RefObject, PureComponent } from 'react';
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
    onUnmount?: (page: [number, number] | number, scrollTop: number) => void;
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
interface MemoCache {
    result?: any;
    depes?: any[];
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
    listComponentCache: MemoCache;
    prevPageNum: [number, number] | number;
    constructor(props: any);
    getSnapshotBeforeUpdate(prevProps: Props, prevState: State): any[] | null;
    componentDidUpdate(prevProps: Props, prevState: State, snapshot: [number, number]): void;
    componentWillUnmount(): void;
    onScrollToLower: () => void;
    onScrollToUpper: () => void;
    checkScroll: () => void;
    onScroll: (e: any) => void;
    onTurning: (page: [number, number] | number, sid: number) => void;
    onToolsTurning: (page?: number | undefined) => void;
    onRetryToPrev: () => void;
    onRetryToNext: () => void;
    defaultTools: (curPage: [number, number] | number, totalPages: number, totalItems: number, show: boolean, loading: boolean, onTurning: (page?: number | undefined) => void) => JSX.Element;
    useMemo<C>(cache: {
        result?: C;
        depes?: any[];
    }, callback: () => C, depes?: any[]): C;
    switchTools(showTools: boolean): void;
    render(): JSX.Element;
}
export default Component;
