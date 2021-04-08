import { PureComponent, ReactNode } from 'react';
export interface Props {
    className?: string;
    children: ReactNode;
    scrollTop: number;
    forwardedRef: any;
    onScroll: (e: {
        detail: {
            scrollTop: number;
        };
    }) => void;
    onScrollToLower: () => void;
    onScrollToUpper: () => void;
    upperThreshold: number;
    lowerThreshold: number;
}
interface State {
}
declare class Component<T> extends PureComponent<Props, State> {
    state: State;
    scrollToUpperTimer: number;
    scrollToLowerTimer: number;
    componentDidMount(): void;
    componentDidUpdate(prevProps: Props, prevState: State, snapshot: [number, number]): void;
    emitScrollToLower: () => void;
    emitScrollToUpper: () => void;
    onScroll: (e: any) => void;
    render(): JSX.Element;
}
export default Component;
