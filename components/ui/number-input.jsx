import { Input } from "@/components/ui/input"

export function NumberInput({
  onChange,
  value,
  formatOptions,
  ...props
}) {
  return (
    <Input
      {...props}
      onChange={e => {
        const number = e.target.valueAsNumber
        onChange(isNaN(number) ? null : number)
      }}
      value={value ?? ""}
      type="number" />
  );
}
