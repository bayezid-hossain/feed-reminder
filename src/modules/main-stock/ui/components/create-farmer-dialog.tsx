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
import { createFarmerSchema } from "@/modules/farmers/schema";
import { trpc } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export const CreateFarmerDialog = () => {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const form = useForm<z.infer<typeof createFarmerSchema>>({
    resolver: zodResolver(createFarmerSchema),
    defaultValues: {
      name: "",
    },
  });

  const createMutation = trpc.farmers.create.useMutation({
    onSuccess: () => {
      toast.success("Farmer created successfully");
      utils.farmers.getMany.invalidate();
      setOpen(false);
      form.reset();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (values: z.infer<typeof createFarmerSchema>) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Farmer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Farmer</DialogTitle>
          <DialogDescription>
            Create a new farmer entity to manage stock and cycles.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
