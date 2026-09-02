import { auth } from './firebaseApp';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  readonly error: string;
  readonly operationType: OperationType;
  readonly path: string | null;
  readonly authInfo: {
    readonly userId?: string | null;
    readonly email?: string | null;
    readonly emailVerified?: boolean | null;
    readonly isAnonymous?: boolean | null;
    readonly tenantId?: string | null;
    readonly providerInfo?: {
      readonly providerId?: string | null;
      readonly email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuthUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuthUser?.uid,
      email: currentAuthUser?.email,
      emailVerified: currentAuthUser?.emailVerified,
      isAnonymous: currentAuthUser?.isAnonymous,
      tenantId: currentAuthUser?.tenantId,
      providerInfo: currentAuthUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
