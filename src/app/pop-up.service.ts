import { EventEmitter, Injectable } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { PopUpComponent } from './pop-up/pop-up.component';
import { Routines, Send_block } from './models/routines.model';
import { SendData } from './new-block.service';
import { PopUpNameDuplicateComponent } from './pop-up-name-duplicate/pop-up-name-duplicate.component';

@Injectable({
  providedIn: 'root'
})
export class PopUpService {

  blockUpdated: EventEmitter<Send_block> = new EventEmitter<Send_block>();
  NameRoutine: EventEmitter<void> = new EventEmitter<void>();
  NameRoutine_Send: EventEmitter<string> = new EventEmitter<string>();
  saveRoutine: EventEmitter<SendDataRoutine> = new EventEmitter<SendDataRoutine>();
  clearRoutine: EventEmitter<string> = new EventEmitter<string>();
  saveRoutineEvent: EventEmitter<SendDataRoutine> = new EventEmitter<SendDataRoutine>();
  retrieve_past_routine: EventEmitter<Routines> = new EventEmitter<Routines>();
  retrieve_current_routine: EventEmitter<Routines> = new EventEmitter<Routines>();
  save_current_routine: EventEmitter<string> = new EventEmitter<string>();
  delete_tab: EventEmitter<number> = new EventEmitter<number>();
  replaceRoutineEvent: EventEmitter<Number> = new EventEmitter<Number>();
  store_current_routine: EventEmitter<Change_Routine> = new EventEmitter<Change_Routine>();
  results_ready: EventEmitter<Routines> = new EventEmitter<Routines>();

  send_data: SendData = new SendData();
  send_data_routine: SendDataRoutine = new SendDataRoutine();

  current_routine: Routines = new Routines();

  constructor(private popOverController: PopoverController) {} //private rs: RestService

  async openDuplicateModal(routine_name){ 
    // Pop-up when repeated name has been found

    const modal = await this.popOverController.create({
      component: PopUpNameDuplicateComponent,
      componentProps: {
        routine_name : routine_name
      },
      cssClass:'rename-routine'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data === 1) { // We wan't to overwrite
        this.replaceRoutineEvent.emit(result.data);
      } // Else, nothing happens, just continue editing
    });

    await modal.present();
    }

  async openModal(block: Send_block) { // Parameters for every type of block

    const modal = await this.popOverController.create({
      component: PopUpComponent,
      componentProps: {
        block: block // Pass the block as a parameter to the modal
      }
    });

    modal.onDidDismiss().then((result) => {
      if (result.role === 'dataSaved') { // Click on save in the pop-up
        this.blockUpdated.emit(result.data);
        this.send_data_routine.routine = this.current_routine;
        this.send_data_routine.type_def = "Show_Routine";
        this.saveRoutineEvent.emit(this.send_data_routine);
      }
    });

    await modal.present();
  }

  push_routine(routine: Routines){
    // Push a routine in block-view
    this.retrieve_past_routine.emit(routine);
  }

  retrieve_routine(action:string, routine?: Routines){ // Retrieve routine from current view and perform action
    if(action=="store"){
      // When changing the view
      this.current_routine = routine;    
    } else if(action == "get"){
      this.retrieve_current_routine.emit(this.current_routine);
    } else if(action == "save_routine"){
      this.save_current_routine.emit("save");
    } else if(action == "change_tab"){
      let change_routine = new Change_Routine();
      change_routine.current_routine = this.current_routine;
      if(routine != undefined){
        change_routine.new_routine = routine;
      }
      this.store_current_routine.emit(change_routine);
    }
  }

  result_ready(rutine: Routines){ // When routine is saved and tab is updated
    this.results_ready.emit(rutine);
  }
}

export class SendDataRoutine{
  type_def: string;
  routine?: Routines;
  name?: string;
}

export class Change_Routine{
  new_routine: Routines;
  current_routine: Routines;
}
