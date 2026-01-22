"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startCycleSchema } from "@/modules/farmers/schema";
import { trpc } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StartCycleModal = ({ open, onOpenChange }: Props) => {
  const utils = trpc.useUtils();
  const form = useForm<z.infer<typeof startCycleSchema>>({
    resolver: zodResolver(startCycleSchema),
    defaultValues: {
        age: 1,
    }
  });

  const { data: farmers } = trpc.farmers.getMany.useQuery({
    page: 1,
    pageSize: 100,
  });

  const createMutation = trpc.farmers.startCycle.useMutation({
    onSuccess: () => {
      toast.success("Cycle started successfully");
      utils.farmers.getCycles.invalidate();
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (values: z.infer<typeof startCycleSchema>) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Cycle</DialogTitle>
          <DialogDescription>
            Select a farmer and enter cycle details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="farmerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farmer (Main Stock)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a farmer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {farmers?.items.map((farmer) => (
                        <SelectItem key={farmer.id} value={farmer.id}>
                          {farmer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="doc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DOC (Day Old Chicks)</FormLabel>
                  <FormControl>
                    <Input
                        type="number"
                        placeholder="Number of birds"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Age (Days)</FormLabel>
                  <FormControl>
                    <Input
                        type="number"
                        placeholder="Age"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Start Cycle
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
