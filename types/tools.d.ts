import React, { ReactNode } from 'react';
export interface ToolsProps {
    className?: string;
    show: boolean;
    loading: boolean;
    curPage: [number, number] | number;
    totalPages: number;
    onTurning: (page?: number) => void;
    children?: ReactNode;
}
declare const _default: React.NamedExoticComponent<ToolsProps>;
export default _default;
