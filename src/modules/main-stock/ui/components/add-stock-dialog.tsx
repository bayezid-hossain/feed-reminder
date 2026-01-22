"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { addStockSchema } from "@/modules/farmers/schema";
import { trpc } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface Props {
  farmerId: string;
  farmerName: string;
}

export const AddStockDialog = ({ farmerId, farmerName }: Props) => {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const form = useForm<z.infer<typeof addStockSchema>>({
    resolver: zodResolver(addStockSchema),
    defaultValues: {
      farmerId,
      amount: 0,
      note: "",
    },
  });

  const addStockMutation = trpc.farmers.addStock.useMutation({
    onSuccess: () => {
      toast.success("Stock added successfully");
      utils.farmers.getMany.invalidate();
      setOpen(false);
      form.reset({ farmerId, amount: 0, note: "" });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (values: z.infer<typeof addStockSchema>) => {
    addStockMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stock for {farmerName}</DialogTitle>
          <DialogDescription>
            Add feed to the main stock.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (Bags)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional note" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addStockMutation.isPending}>
                Add Stock
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
