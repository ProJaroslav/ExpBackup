declare namespace HSI {
    namespace TextDrawWidget {
        interface IWidgetContentProps {
            /** - Nástroj pro kreslení geometrie. */
            sketch: __esri.Sketch;
            /** Konstruktor pro vytvoření textového symbolu. */
            TextSymbol: typeof __esri.TextSymbol;
        }
    }
}