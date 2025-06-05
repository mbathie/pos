'use client';

import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

export default function Delete({ open, onOpenChange, onConfirm, name }) {
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.body.style.pointerEvents = '';
          }}
        >
          <AlertDialogTitle>
            Delete
          </AlertDialogTitle>
          <AlertDialogDescription>
            {name ? (
              <>Are you sure you want to delete <span className='bg-accent px-2 mr-2'>{name}</span>? This action cannot be undone.</>
            ) : (
              <span>Invalid data, please try again later.</span>
            )}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
}