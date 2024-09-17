import { useHsiSelection } from "widgets/shared-code/hooks";

export function useSelectionFormat<T>(formatFunction: (selection: HSI.IHsiPopulatedSelection) => T): T {
    const selection = useHsiSelection({ populate: true });

    return formatFunction(selection);
}

export default useSelectionFormat;