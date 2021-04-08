import React, {PureComponent, ReactNode} from 'react';

export interface Props {
  className?: string;
  children: ReactNode;
  scrollTop: number;
  forwardedRef: any;
  onScroll: (e: {detail: {scrollTop: number}}) => void;
  onScrollToLower: () => void;
  onScrollToUpper: () => void;
  upperThreshold: number;
  lowerThreshold: number;
}
interface State {}
class Component<T> extends PureComponent<Props, State> {
  state: State = {};

  scrollToUpperTimer: number = 0;

  scrollToLowerTimer: number = 0;

  componentDidMount() {
    const list = this.props.forwardedRef.current;
    list.scrollTop = this.props.scrollTop;
  }

  componentDidUpdate(prevProps: Props, prevState: State, snapshot: [number, number]) {
    if (this.props.scrollTop !== prevProps.scrollTop) {
      const list = this.props.forwardedRef.current;
      list.scrollTop = this.props.scrollTop;
    }
  }

  emitScrollToLower = () => {
    const curTime = +new Date();
    if (curTime - this.scrollToLowerTimer > 1000) {
      this.scrollToLowerTimer = curTime;
      this.props.onScrollToLower();
    }
  };

  emitScrollToUpper = () => {
    const curTime = +new Date();
    if (curTime - this.scrollToUpperTimer > 1000) {
      this.scrollToUpperTimer = curTime;
      this.props.onScrollToUpper();
    }
  };

  onScroll = (e: any) => {
    const scrollTop = e.target.scrollTop;
    const scrollHeight = e.target.scrollHeight;
    const clientHeight = e.target.clientHeight;
    if (scrollTop < this.props.upperThreshold) {
      this.emitScrollToUpper();
    } else if (scrollHeight - (scrollTop + clientHeight) < this.props.lowerThreshold) {
      this.emitScrollToLower();
    }
    this.props.onScroll({detail: {scrollTop}});
  };

  render() {
    const {className = '', forwardedRef, children} = this.props;
    return (
      <div className={`ppscroll-view ${className}`} ref={forwardedRef} onScroll={this.onScroll}>
        {children}
      </div>
    );
  }
}

export default Component;
