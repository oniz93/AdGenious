import { UserDocument } from '../models/User';

export function toUserDTO(user: UserDocument) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name ?? null,
    credits: user.credits,
    facebookConnected: Boolean(user.facebookId),
    selectedAdAccountId: user.selectedAdAccountId ?? null,
    createdAt: user.createdAt,
  };
}
