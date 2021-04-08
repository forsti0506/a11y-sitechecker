export interface ElementsFromEvaluation {
    elementsByVisibility: ElementVisibility[];
    focusableNonStandardElements: string[];
}

export interface ElementVisibility {
    element: string;
    visible: boolean;
}

export interface ListenerObject {
    listeners: Event[];
}
