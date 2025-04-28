'use client'
import React from 'react'
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogOverlay, 
  AlertDialogPortal, 
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel 
} from "@/components/ui/alert-dialog"; // Assuming named imports

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'; // Importing Radix DropdownMenu

// const wait = () => new Promise((resolve) => setTimeout(resolve, 1000));

export default () => {
  const [open, setOpen] = React.useState(false);  // Separate state for dialog
  // const [openMenu, setOpenMenu] = React.useState(false);      // Separate state for dropdown menu

  // Handle opening and closing of the dialog
  // const openDialogHandler = () => {
  //   setOpenDialog(true);
  //   setOpenMenu(false); // Close the dropdown menu when dialog opens
  // };

  // // Handle closing the dialog and preventing UI freeze
  // const closeDialogHandler = () => {
  //   setOpenDialog(false);
  // };

  return (
    <div>
      {/* Dropdown Menu Trigger */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="bg-blue-500 text-white py-2 px-4 rounded">
            Open Menu
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content className="bg-white border shadow-md rounded-md p-2">
          {/* Dropdown Menu Items */}
          <DropdownMenu.Item onClick={() => setOpen(true)} className="py-2 px-4 hover:bg-gray-200 cursor-pointer">
            Open Dialog
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      {/* Dialog itself */}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.body.style.pointerEvents = '';
          }}>
            <AlertDialogTitle>Dialog Title</AlertDialogTitle>

            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-500 text-white py-2 px-4 rounded mr-2">
                Cancel
              </AlertDialogCancel>
              <button
                type="submit"
                className="bg-blue-500 text-white py-2 px-4 rounded"
              >
                Submit
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    </div>
  );
};