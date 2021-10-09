export interface ElementsFromEvaluation {
    elementsByVisibility: string[];
    focusableNonStandardElements: string[];
    currentIndex: number;
    spanElements: SpanElement[];
}

export interface ListenerObject {
    listeners: Event[];
}
export interface SpanElement {
    elementId: string;
    spanId: string;
    visible: boolean;
}
