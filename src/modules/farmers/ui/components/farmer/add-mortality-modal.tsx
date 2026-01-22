"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import ResponsiveDialog from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Local schema just for the form input (amount only)
const formSchema = z.object({
  amount: z.number().min(1, "Must be at least 1"),
});

interface AddMortalityModalProps {
  cycleId: string;
  cycleName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddMortalityModal = ({
  cycleId,
  cycleName,
  open,
  onOpenChange,
}: AddMortalityModalProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: 0 },
  });

  const mutation = useMutation(
    trpc.farmers.addMortality.mutationOptions({
      onSuccess: async () => {
        toast.success(`Mortality recorded for ${cycleName}`);
        await queryClient.invalidateQueries(trpc.farmers.getCycles.queryOptions({}));
        onOpenChange(false);
        form.reset();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate({ cycleId, amount: values.amount });
  };

  return (
    <ResponsiveDialog
      title="Add Mortality"
      description={`Record new mortality count for ${cycleName}.`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Birds</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="destructive" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Recording..." : "Record Mortality"}
          </Button>
        </form>
      </Form>
    </ResponsiveDialog>
  );
};
