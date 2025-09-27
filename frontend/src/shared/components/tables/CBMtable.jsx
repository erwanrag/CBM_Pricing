// src/shared/components/tables/CBMtable.jsx
import * as React from "react";

export const Table = ({ className, ...props }) => (
  <div className="w-full overflow-auto">
    <table className={`w-full caption-bottom text-sm ${className || ""}`} {...props} />
  </div>
);

export const TableHeader = ({ className, ...props }) => <thead className={className} {...props} />;

export const TableBody = ({ className, ...props }) => <tbody className={className} {...props} />;

export const TableFooter = ({ className, ...props }) => <tfoot className={className} {...props} />;

export const TableRow = ({ className, ...props }) => (
  <tr className={`border-b transition-colors hover:bg-muted/50 ${className || ""}`} {...props} />
);

export const TableHead = ({ className, ...props }) => (
  <th
    className={`h-10 px-2 text-left align-middle font-medium text-muted-foreground ${className || ""}`}
    {...props}
  />
);

export const TableCell = ({ className, ...props }) => (
  <td className={`p-2 align-middle ${className || ""}`} {...props} />
);

export const TableCaption = ({ className, ...props }) => (
  <caption className={`mt-4 text-sm text-muted-foreground ${className || ""}`} {...props} />
);
