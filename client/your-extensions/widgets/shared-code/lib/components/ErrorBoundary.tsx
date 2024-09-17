import { React } from "jimu-core";
const WarningContent = React.lazy(() => import("./WarningContent"));

/**
 * - Odchytávání chyb ve vnořených komponentách.
 * - [Read more...](https://reactjs.org/docs/error-boundaries.html)
 */
export default class extends React.Component<React.PropsWithChildren<IErrorBoundaryProps>, IState> {
    constructor(props: React.PropsWithChildren<IErrorBoundaryProps>) {
        super(props);
        this.state = { 
            errorMessage: null
        };
    }
  
    public static getDerivedStateFromError(error: Error): IState {
        return { errorMessage: error?.message };
    }
  
    render() {
        if (!!this.state.errorMessage) {
            return <>
                <React.Suspense fallback={<></>} >
                    <WarningContent
                        message={this.state.errorMessage}
                        title={this.props.errorMessageTitle} 
                    />
                </React.Suspense>
                {this.props.suffix || <></>}
            </>;
        }
    
        return this.props.children; 
    }
  }
  
  interface IErrorBoundaryProps {
      errorMessageTitle: string;
      suffix?: JSX.Element;
  }

  interface IState {
      errorMessage: string;
  }