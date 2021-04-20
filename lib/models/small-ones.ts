export interface ElementsFromEvaluation {
    elementsByVisibility: ElementVisibility[];
    focusableNonStandardElements: string[];
    currentIndex: number;
}

export interface ElementVisibility {
    element: string;
    visible: boolean;
}

export interface ListenerObject {
    listeners: Event[];
}
