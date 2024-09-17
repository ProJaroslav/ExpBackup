import {React, type AllWidgetProps, IMConfig} from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
const { useState } = React
import Point from 'esri/geometry/Point'
const Widget = (props: AllWidgetProps<IMConfig>) => {
    const [latitude, setLatitude] = useState<string>('')
    const [longitude, setLongitude] = useState<string>('')
    const {config} = props
    const activeViewChangeHandler = (jmv: JimuMapView) => {
        if (jmv) {
            jmv.view.on('pointer-move', (evt) => {
                console.log(JSON.stringify(props.config))

                const point: Point = jmv.view.toMap({
                    x: evt.x,
                    y: evt.y
                })
                setLatitude(point.latitude.toFixed(3))
                setLongitude(point.longitude.toFixed(3))
            })
        }
    }
    

    return (
        <div className="widget-starter jimu-widget" 
             // style={{background: config.backgroundColor}}
        >
            {props.useMapWidgetIds && props.useMapWidgetIds.length === 1 && (
                <JimuMapViewComponent useMapWidgetId={props.useMapWidgetIds?.[0]} onActiveViewChange={activeViewChangeHandler} />
            )}
            <p>
                Lat/Lon: {latitude} {longitude}
            </p>
        </div>
    )}

export default Widget;