import { React } from "jimu-core";
import { TextInput, Icon, Tooltip, Popper } from "jimu-ui";
import { useForceUpdate } from "widgets/shared-code/hooks";
const duplicateIcon = require('jimu-ui/lib/icons/duplicate-16.svg');

/** - Needitovatelné textové pole s tlačítkem pro zkopírování jeho obsahu. */
export default function(props: ICopyInputProps) {
    const buttonRef = React.useRef<HTMLDivElement>();
    const inputRef = React.useRef<HTMLInputElement>();
    const [lastCopied, onCopy] = React.useReducer(() => new Date(), null);
    /** - Došlo ke zkopírování textu před méně než 1.5s od posledního renderu komponenty? */
    const justCopied = lastCopied instanceof Date && lastCopied.getTime() + 1500 > Date.now();
    const forceUpdate = useForceUpdate();

    // Po 2s po posledním zkopírování textu se provede rerender komponenty.
    React.useEffect(() => {
        setTimeout(() => {
            forceUpdate();
        }, 2000);
    }, [lastCopied, forceUpdate]);

    return <TextInput
        value={props.text}
        disabled={props.loading}
        ref={inputRef}
        suffix={
            <>
                <Tooltip
                    /** @todo - Překlady */
                    title="Kopírovat"
                >
                    <div
                        ref={buttonRef}
                        style={{
                            height: "100%",
                            color: justCopied ? "var(--primary)" : undefined,
                            cursor: "pointer"
                        }}
                        onClick={() => {
                            if (!props.loading) {
                                navigator.clipboard.writeText(props.text);
                                onCopy();
                            }
                        }}
                    >
                        <Icon
                            icon={duplicateIcon}
                        />
                    </div>
                </Tooltip>
                <Popper
                    showArrow
                    open={justCopied}
                    reference={buttonRef.current}
                    style={{
                        padding: 10,
                        zIndex: 2000
                    }}
                >
                    {/** @todo - Překlady */}
                    Zkopírováno
                </Popper>
            </>
        }
    />
}

interface ICopyInputProps {
    /** Text, který chceme zobrazit v textovém poli. */
    text: string;
    /** Má se v textovém poli zobrazit načítání? */
    loading?: boolean;
}

interface IState {
    /** - Čas kdy došlo k poslednímu zkopírování textu {@link text}. */
    lastCopied?: Date;
}