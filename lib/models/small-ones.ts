export interface ElementsFromEvaluation {
    visibleElements: VisibleElement[];
    focusableNonStandardElements: string[];
}

export interface VisibleElement {
    element: string;
    visible: boolean;
}
