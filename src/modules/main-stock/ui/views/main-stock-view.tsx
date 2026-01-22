"use client";

import { MainStockTable } from "../components/main-stock-table";
import { CreateFarmerDialog } from "../components/create-farmer-dialog";

export const MainStockView = () => {
    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Main Stock</h1>
                <CreateFarmerDialog />
            </div>

            <MainStockTable />
        </div>
    );
}
