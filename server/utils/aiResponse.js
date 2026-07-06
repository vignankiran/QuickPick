exports.createInsight = ({
  priority,
  category,
  title,
  message,
  recommendedAction,
  reason,
  confidence = 90,
}) => {
  return {
    priority,
    category,
    title,
    message,
    recommendedAction,
    reason,
    confidence,
  };
};