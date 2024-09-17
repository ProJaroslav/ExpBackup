import { React } from "jimu-core";
import { Label, TextInput, NumericInput, Slider, TextArea } from "jimu-ui";
import { TextStyle, type TextStyleProps } from 'jimu-ui/advanced/style-setting-components';
import { GeometryHelper } from "widgets/shared-code/helpers";

const { useRef, useEffect, useReducer } = React;

export default function({ sketch, TextSymbol }: HSI.TextDrawWidget.IWidgetContentProps) {
    const containerRef = useRef();
    const [symbolState, setSymbolState] = useReducer(reducer, defaultState);

    useEffect(() => {
        sketch.container = containerRef.current;
        sketch.viewModel.pointSymbol = new TextSymbol(symbolState);
    }, [sketch, containerRef, TextSymbol, symbolState]);

    return <>
        <div ref={containerRef}></div>
        <TextStyle
            bold={symbolState.font.weight === "bold"}
            italic={symbolState.font.style === "italic"}
            underline={symbolState.font.decoration === "underline"}
            strike={symbolState.font.decoration === "line-through"}
            size={typeof symbolState.font.size === "number" ? symbolState.font.size.toString() : symbolState.font.size}
            color={symbolState.color.toString()}
            onChange={(key: any, value) => setSymbolState({ key, value })}
        />

        <Label>
            Hodnota
            <TextArea
                value={symbolState.text}
                onChange={ev => {
                    setSymbolState({ key: "text", value: ev.target.value });
                }}
            />
        </Label>
        
        <Label>
            Rotace
            <Slider
                min={0}
                max={360}
                value={symbolState.angle}
                onChange={ev => {
                    setSymbolState({ key: "angle", value: ev.target.value });
                }}
            />
        </Label>
    </>;
}

function reducer(currentsState: ISymbolState, { key, value }: IStateChangeParams): ISymbolState {
    try {
        console.log(value)
        switch(key) {
            case "underline":
                return {
                    ...currentsState,
                    font: {
                        ...currentsState.font,
                        decoration: value ? "underline" : "none"
                    }
                };
            case "strike":
                return {
                    ...currentsState,
                    font: {
                        ...currentsState.font,
                        decoration: value ? "line-through" : "none"
                    }
                };
            case "bold":
                return {
                    ...currentsState,
                    font: {
                        ...currentsState.font,
                        weight: value ? "bold" : "normal"
                    }
                };
            case "italic":
                return {
                    ...currentsState,
                    font: {
                        ...currentsState.font,
                        style: value ? "italic" : "normal"
                    }
                };
            case "size":
                return {
                    ...currentsState,
                    font: {
                        ...currentsState.font,
                        size: value
                    }
                };
            case "color":
                return {
                    ...currentsState,
                    color: GeometryHelper.getColor(value)
                };
            case "text":
                return {
                    ...currentsState,
                    text: value
                };

            case "angle":
                return {
                    ...currentsState,
                    angle: parseInt(value)
                };

            default:
                throw new Error(`Unhandled change state key: ${key}`);
        }
    } catch(err) {
        console.warn(err);
        return currentsState;
    }
}

const defaultState: ISymbolState = {
    color: "red",
    text: "",
    angle: 0,
    font: {
        size: 9,
        family: "sans-serif",
        decoration: "none",
        weight: "normal",
        style: "normal"
    }
};

type ISymbolState = Pick<__esri.TextSymbolProperties, "angle" | "color" | "text" | "font">;

type IStateChangeParams = ITextStyleChangeParams | ISizeChangeParams | IColorChangeParams | ITextChangeParams;

interface ITextStyleChangeParams extends IStateChangeParamsBase<keyof Pick<TextStyleProps, "bold" | "italic" | "underline" | "strike">, boolean> {
}

interface ISizeChangeParams extends IStateChangeParamsBase<keyof Pick<TextStyleProps, "size">, TextStyleProps['size']> {
}

interface IColorChangeParams extends IStateChangeParamsBase<keyof Pick<TextStyleProps, "color">, TextStyleProps['color']> {
}

interface ITextChangeParams extends IStateChangeParamsBase<"text" | "angle", string> {
}

interface IStateChangeParamsBase<T extends string, V extends any> {
    key: T;
    value: V;
}