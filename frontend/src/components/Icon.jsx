import { ICON_FALLBACK, ICON_REGISTRY, resolveIconName } from '../config/iconRegistry';

const Icon = ({ name, size = 20, strokeWidth = 1.8, className, ...props }) => {
  const IconComponent = ICON_REGISTRY[resolveIconName(name)] || ICON_REGISTRY[ICON_FALLBACK];
  return <IconComponent size={size} strokeWidth={strokeWidth} className={className} {...props} />;
};

export default Icon;
