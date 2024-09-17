import { React } from "jimu-core";
import { SettingCollapse } from 'jimu-ui/advanced/setting-components';
import { useHasArrayChanged } from "widgets/shared-code/hooks";

export default function(props: IAccordionProps) {
    const [opened, setOpened] = React.useState<Array<IAccordionProps['items'][0]['id']>>([]);
    const hasArrayChanged = useHasArrayChanged(props.items, (currentItem, prevItem) => currentItem.id === prevItem.id);

    React.useEffect(() => {
        try {
            if (hasArrayChanged) {
                if (!props.items.some(item => opened.includes(item.id))) {
                    setOpened(props.items
                        .filter(item => item.defaultOpened)
                        .map(item => item.id));
                }
            }
        } catch(err) {
            console.warn(err);
        }
    });

    return <div>
        {
            props.items?.map(item => {
                return <React.Fragment key={item.id}>
                    <SettingCollapse
                        style={props.collapseHeaderProps}
                        label={item.label as string}
                        isOpen={opened.includes(item.id)}
                        onRequestOpen={() => setOpened(state => props.multiopen ? state.concat(item.id) : [item.id])}
                        onRequestClose={() => setOpened(state => {
                            if (!props.multiopen) {
                                return [];
                            }
                            let index = state.indexOf(item.id);
                            if (index === -1) {
                                return state;
                            }
                            let stateCopy = [...state];
                            stateCopy.splice(index, 1);

                            return stateCopy;
                        })}
            
                    >
                    </SettingCollapse>
                    <Collapse
                        opened={opened.includes(item.id)}
                        style={props.collapseProps}
                    >
                        {item.content}
                    </Collapse>
                </React.Fragment>
            })
        }
    </div>;
}

const animationDuration = 350;

interface ICollapseProps {
    opened: boolean;
    style?: React.CSSProperties;
}

interface ICollapseState {
    height: number | "auto",
    display: "none" | "inherit";
}

class Collapse extends React.Component<React.PropsWithChildren<ICollapseProps>, ICollapseState> {
    constructor(props: React.PropsWithChildren<ICollapseProps>) {
        super(props);

        this.state = {
            height: 0,
            display: "none"
        };
    }

    divRef = React.createRef<HTMLDivElement>();
    abortController: AbortController;

    componentDidMount() {
        if (this.props.opened) {
            this.open();
        }
    }

    componentDidUpdate(prevProps: ICollapseProps) {
        if (prevProps.opened !== this.props.opened) {
            if (this.props.opened) {
                this.open();
            } else {
                this.close();
            }
        }
    }

    private open() {
        const signal = this.newAbortSignal;

        this.setState({
            height: 0,
            display: "inherit"
        }, () => {
            this.setState({
                height: this.divRef.current.clientHeight
            }, () => {
                setTimeout(() => {
                    if (!signal.aborted) {
                        this.setState({
                            height: "auto"
                        });
                    }
                }, animationDuration);
            });
        });
    }

    private close() {
        const signal = this.newAbortSignal;

        this.setState({
            height: this.divRef.current.clientHeight
        }, () => {
            this.setState({
                height: 0
            }, () => {
                setTimeout(() => {
                    if (!signal.aborted) {
                        this.setState({
                            display: "none"
                        });
                    }
                }, animationDuration);
            });
        })
    }

    private get newAbortSignal(): AbortSignal {
        if (this.abortController) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();

        return this.abortController.signal;

    }

    render() {
        if (this.state.display === "none") {
            return <></>;
        }

        var style: React.CSSProperties = { overflow: "hidden", transition: `height ${animationDuration / 1000}s ease-in`, height: this.state.height };

        if (this.props.style) {
            style = { ...this.props.style, ...style };
        }

        return <div style={style}>
            <div ref={this.divRef}>
                {this.props.children}
            </div>
        </div>;
    }
}

export interface IAccordionProps {
    items: Array<{
        id: string | number;
        label: string | JSX.Element;
        content: JSX.Element;
        defaultOpened?: boolean;
    }>;
    /** - Může být otevřeno více položek najednou? */
    multiopen?: boolean;
    collapseProps?: ICollapseProps['style'];
    collapseHeaderProps?: React.CSSProperties;
}