import React from "react";

const SectionTitle = ({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) => {
  return (
    <h2 className="text-lg font-bold text-gray-800 border-l-4 border-indigo-600 pl-3 mb-6 flex items-center gap-2">
      {icon} {title}
    </h2>
  );
};

export default SectionTitle;
