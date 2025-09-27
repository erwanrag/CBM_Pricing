//src/shared/components/selects/CBMselect.jsx
import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

export const Select = React.forwardRef(({ children, ...props }, ref) => (
  <div ref={ref} className="relative" {...props}>
    {children}
  </div>
));

export const SelectTrigger = ({ children, className, ...props }) => (
  <button
    {...props}
    className={`flex items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
  >
    {children}
    <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
  </button>
);

export const SelectContent = ({ children, ...props }) => (
  <div
    {...props}
    className="absolute mt-2 w-full rounded-md bg-white border border-gray-200 shadow-lg z-50"
  >
    <ul className="max-h-60 overflow-auto py-1 text-sm">{children}</ul>
  </div>
);

export const SelectItem = ({ children, value, onClick }) => (
  <li onClick={() => onClick(value)} className="px-4 py-2 hover:bg-blue-100 cursor-pointer">
    {children}
  </li>
);

export const SelectValue = ({ placeholder }) => (
  <span className="text-gray-500">{placeholder}</span>
);
