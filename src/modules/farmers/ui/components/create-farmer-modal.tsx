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
import { farmerInsertSchema } from "../../schema";
import { toast } from "sonner";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

interface CreateFarmerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateFarmerModal = ({
  open,
  onOpenChange,
}: CreateFarmerModalProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof farmerInsertSchema>>({
    resolver: zodResolver(farmerInsertSchema),
    defaultValues: {
      name: "",
      doc: "",
      inputFeed: 0,
    },
  });

  const createMutation = useMutation(
    trpc.farmers.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Farmer created");

        await queryClient.invalidateQueries(
          trpc.farmers.getMany.queryOptions({})
        );

        onOpenChange(false);
        form.reset();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const onSubmit = (values: z.infer<typeof farmerInsertSchema>) => {
    createMutation.mutate(values);
  };

  return (
    <ResponsiveDialog
      title="Create Farmer"
      description="Add a new farmer to the list."
      open={open}
      onOpenChange={onOpenChange}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Farmer Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="doc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Input Doc</FormLabel>
                <FormControl>
                  <Input placeholder="DOC" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="inputFeed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Input Feed</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Feed Amount"
                    {...field}
                    onChange={(e) =>
                      field.onChange(e.target.valueAsNumber)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending
              ? "Creating..."
              : "Create"}
          </Button>
        </form>
      </Form>
    </ResponsiveDialog>
  );
};
