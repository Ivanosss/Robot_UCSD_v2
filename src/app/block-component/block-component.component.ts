import { Component, ViewChild, ElementRef, AfterViewInit, ViewChildren, QueryList,  ViewContainerRef, EventEmitter, Output } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular';
import { Block } from '../models/blocks.model';
import { Routines, Send_block } from '../models/routines.model';
import { PopUpService, SendDataRoutine } from '../pop-up.service';
import { NewBlockService } from '../new-block.service';
import { SendData } from '../new-block.service';
import { RestService } from '../rest.service';
import { TabServiceService } from '../tab-service.service';

@Component({
  selector: 'app-block-component',
  templateUrl: './block-component.component.html',
  styleUrls: ['./block-component.component.scss'],
})

export class BlockComponentComponent implements AfterViewInit {
  @ViewChild('start', { static: false, read: ElementRef }) startElement: ElementRef;
  @ViewChild('end', { static: false, read: ElementRef }) endElement: ElementRef;
  @ViewChildren('blockRef') buttons: QueryList<QueryList<IonButton>>;
  @ViewChild('blockRef', { read: ElementRef }) buttonRef: ElementRef;
  @ViewChild('grid', { read: ElementRef }) gridRef: ElementRef;
  @ViewChild('botonesContainer', { read: ViewContainerRef }) botonesContainer: ViewContainerRef;
  @Output() agregarTabEvent = new EventEmitter<void>();

  current_routine: Routines = new Routines(); // Super important, where the visible routine is stored
  send_data_routine: SendDataRoutine = new SendDataRoutine();
  current_block: Send_block = new Send_block();

  blocks: number = 0;
  dif: number = 0;

  cellPositions: { center_x: number; center_y: number, length: number, height: number}[] = [];
  allPositions: { center_x: number; center_y: number, length: number, height: number}[] = [];
  rowPositions: number[] = [];
  scrollPosition = 0;

  startRect = new DOMRect;
  endRect = new DOMRect;

  isToastOpenClass = false;
  isToastOpenRoutine = false;
  isToastOpenName = false;
  
  GetChildData(data){  
    console.log(data);  
  } 

  constructor(private popUpService: PopUpService, private newBlockService: NewBlockService, 
    private ionContent: IonContent, private rs: RestService, private tabService: TabServiceService) {

    this.current_routine.array_block = []; // Create a new blanck routine

    this.popUpService.blockUpdated.subscribe((newBlock: Send_block) => {
      // Call your component's function or perform necessary actions when accepted
      this.current_block = newBlock; // New_block with new parameters
    });

    this.popUpService.clearRoutine.subscribe((data) => {
      // If clear routine is accepted just create a new routine
      this.current_routine = new Routines();
    });
    
    this.newBlockService.newBlockAdded.subscribe((data) => {
      const dropped = this.dragFuncion(data.event, data.block); // Make sure it's actually dropped in a valid place
      if(dropped){
        this.openPopUp(this.current_block); // When dropped open the corresponding pop-up
      }
      
      // Save the routine when adding block
      this.send_data_routine.routine = this.current_routine;
      this.send_data_routine.type_def = "Show_Routine";
      this.popUpService.saveRoutineEvent.emit(this.send_data_routine);
    });
    
    this.popUpService.saveRoutineEvent.subscribe((data) => {
      // When the save pop up is accepted it send the name from the pop-up to the curren routine
      if(data.type_def === "Show_Routine" && data.routine.name != ""){ 
        // It already send the routine so now it's sending it to the db
        // Sending it to database
        // Call REST service to upload routine to database
        this.rs.upload_routine(data.routine, "0").subscribe(
          (response) => {
            console.log(response);
            if(response["Code"] == 1){ // Upload routine to the database (Always overwrite)
              this.rs.upload_routine(data.routine, "1").subscribe( 
                (respone) => {
                  console.log(respone);
                },
                (error) => {
                  console.log(error);
                }
              )
            }
            popUpService.result_ready(data.routine); // Send name to app for the tab
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });

    this.popUpService.retrieve_past_routine.subscribe((data) => {
      this.current_routine = data; // Updates the actual rutine
      this.check_cells_positions(); // Updates cell positions in the array
      this.popUpService.retrieve_routine("store", this.current_routine); 
      //Change to store when retrieving past routine
    })

    this.popUpService.save_current_routine.subscribe((data) =>
    // Save routine
    {
      this.popUpService.retrieve_routine("store", this.current_routine);
    })

    this.popUpService.retrieve_current_routine.subscribe((data) =>{
      // Retrieve routine when switching views
      this.current_routine = data;
    })
  }


  async ngOnInit() {
    this.popUpService.retrieve_routine("get"); 
    // When returning to blocks_view return the rutine you where working with
  }
  
  openPopUp(send_block: Send_block, event?: MouseEvent,) { 
    // Parameters pop-up
    if (event == undefined || event.detail === 2){
      if ( send_block.class != 'routine'){ // Rutines open new tab not po-up
        if(send_block.class == "speech" && send_block.name == "Talk"){
          this.popUpService.openModal(send_block); // Only talk blocks open pop-up in speech
        } else {
          if (send_block.class != "routine" && send_block.class != "speech"){
            this.popUpService.openModal(send_block); // Every other type of block
          }
        }
      } else if (event != undefined && event.detail === 2){ // Double click on a routine block
        let block = new Block('0', send_block.name, "") 
        this.rs.get_routine(send_block.name).subscribe( 
          (response) => {
            let routine = new Routines(); // Transform the routine
            routine.name = send_block.name; // Get the name of the new tab
            let i = 0;
            response.forEach(element => { // Add blocks to the routine
              routine.array_block.push([])
              element.forEach(block_item => {
                let block_i = new Send_block();
                block_i.class = block_item.class;
                block_i.name = block_item.name;
                block_i.level = block_item.level;
                block_i.talk = block_item.talk;
                block_i.clear = block_item.clear;
                routine.array_block[i].push(block_i);
              });
              i+=1;
            });
            console.log(routine); //<-------------------------------- PRINT ROUTINE WHEN OPENNING TAB
            this.tabService.addTabToContainer(block, routine); // Add new container and push new_routine
          },
          (error) => {
            console.log(error);
          }
        )
      }
    }
  }

  // FUNCION PARA ABRIR UN TAB CON DOBLE CLICK
  onDoubleClick(event: MouseEvent, index: number, send_block: Send_block ) {
   if(send_block.class === 'routine') // Make sure double click on a routine
   {

   }
  }
  
  reset_edges(){
    if (this.startElement && this.endElement) {
      // Get the references for the start and end boxes
      this.startRect = this.startElement.nativeElement.getBoundingClientRect();
      this.endRect = this.endElement.nativeElement.getBoundingClientRect();

      const gridElement = this.gridRef.nativeElement;
      gridElement.addEventListener('scroll', this.onScroll.bind(this));

    } else {
      console.error('Elements not found');
    }
  }

  ngAfterViewInit() {
    this.ionContent.scrollToTop(0);

    // Check if the startElement and endElement are defined
    setTimeout(() => {
      // Check if the startElement and endElement are defined
      this.reset_edges()
    }, 500); // Adjust the timeout duration as needed
    
  }
  

  check_cells_positions(){
    this.ionContent.scrollToTop(0);
    setTimeout(() => {
      // Get the grid element
    const grid = document.getElementById('grid');

    this.cellPositions = [];
    this.allPositions = [];
    this.rowPositions = [];

    if (grid) {
      // Get all cell elements within the grid

      const rows = grid.querySelectorAll('ion-row');
      rows.forEach((row) => {
        const rect = row.getBoundingClientRect();
        this.rowPositions.push(rect.height)
      })

      const cells = grid.querySelectorAll('ion-col');

      // Initialize an array to store cell positions
      // Loop through each number cell and calculate its position

      let row = 0;
      
      cells.forEach((cell) => {
        if(cell.id === 'num'){
          // Calculate the cell's position relative to the grid container
          const rect = cell.getBoundingClientRect();
          this.dif = rect.width;
          const cellPosition: { center_x: number; center_y: number, length: number, height:number } = {
            center_x: rect.left + rect.width / 2,
            center_y: rect.top + (this.rowPositions[row]) / 2,
            length: rect.width,
            height: this.rowPositions[row],
          };

          // Add the cell's position to the array
          this.cellPositions.push(cellPosition);
          row += 1;
        } else if(cell.id == "block"){
          // Calculate the cell's position relative to the grid container
          const rect = cell.getBoundingClientRect();
          this.dif = rect.width;
          const cellPosition: { center_x: number; center_y: number, length: number, height:number } = {
            center_x: rect.left + rect.width / 2,
            center_y: rect.top + rect.height / 2,
            length: rect.width,
            height: rect.height,
          };

          // Add the cell's position to the array
          this.allPositions.push(cellPosition);
        }
      });
      // Now, cellPositions contains the positions of all cells in the grid

    } else {
      console.error('Grid element not found.');
    }

    },500);
  }

  onScroll(event){ // Adapts scroll on block component to update where the blocks are dropped
    // P.e. if scroll is moved, then the cells positions are updated to represent this change
    this.scrollPosition = event.detail.scrollTop;

    // Use scrollPosition as needed
    this.check_cells_positions();
  }

  // Drag and drop the blocks on the block-component
  dragFuncion(event: DragEvent, block?: Block, send_block?: Send_block, rearenge?: boolean) : boolean{

    // Where was the block you grabbed ?
    const position = { row: -1, column: -1 };

    // rearenge: If drag from a block already in block-component
    if(rearenge){
      // Find where it was previous to the move
      for (let rowIndex = 0; rowIndex < this.current_routine.array_block.length; rowIndex++) {
        const currentRow = this.current_routine.array_block[rowIndex];
        for (let columnIndex = 0; columnIndex < currentRow.length; columnIndex++) {
          if (currentRow[columnIndex] === send_block) {
            position.row = rowIndex;
            position.column = columnIndex;
          }
        }
      }
    }
    
    const data = new SendData(); // SendData = event + block
    if(block != undefined){ // If block is undefined then it was a previous block (block is moved not dropped)
      data.block = block;
    }
    data.event = event;

    this.current_block = new Send_block(); // Blocked dropped or moved
    if(block != undefined){
      this.current_block.name = data.block.label;
    }
    this.current_routine.description = "Description of routine";

    if(block == undefined){ // If block is undefined then it was a previous block
      this.current_block = send_block;
    } else { // You are grabbing from the second sidebar
      switch(data.block.constructor.name){ //Set the class
        case "Facial_Expression":
          this.current_block.class = "facial_expression";
          break;
        case "Body_Gestures":
          this.current_block.class = "body_gesture";
          break;
        case "Tone_Voice":
          this.current_block.class = "tone_of_voice";
          break;
        case "Speech":
          this.current_block.class = "speech";
          break;
        case "Routines_Blocks":
          this.current_block.class = "routine";
          break;
      }
    }

    data.event.preventDefault(); // Prevent the default behavior

    this.check_cells_positions(); // Make sure to update the cells posistions

    let index_row = 0;
    let index_col = 0;

    // Iterate through the coordinates and add unique x values to the Set

    const divide = 10; // hyperparameter that defined the padding of the are to be dropped

    this.reset_edges();

    if(data.event.pageY < this.startRect.top || data.event.pageY > this.endRect.bottom || data.event.pageX < this.startRect.left){
      
      // Drag is Outside of bounds
      if(rearenge){ // Drag a block outside the area bound
        this.delete_previous(position, rearenge); // Delete it
      }

      return false;

    } else if (this.current_block.name == this.current_routine.name || this.current_block.parent_routines.indexOf(this.current_routine.name) > -1){
      // You cant add the current routine to the main routine (or inception) or a parent routine
      this.setOpenName(true);
      return false;

    } else {
      if(this.cellPositions.length == 0 && this.current_routine.array_block.length == 0){
        // There's no blocks currently
        this.current_routine.array_block[0] = [this.current_block]; // Just add it
        if (this.current_block.class == "routine"){ // Check if its routine
          this.current_block.parent_routines = this.current_routine.parent_routines.concat([this.current_routine.name])
          let incoming_routine = new Routines();
          // Update the parent routine in subroutine
          this.rs.get_routine(this.current_block.name).subscribe( 
            (response) => {
              incoming_routine.name = this.current_block.name; // 
              let i = 0;
              response.forEach(element => { // Add blocks to the routine
                incoming_routine.array_block.push([])
                element.forEach(block_item => {
                  let block_i = new Send_block();
                  block_i.class = block_item.class;
                  block_i.name = block_item.name;
                  block_i.level = block_item.level;
                  block_i.talk = block_item.talk;
                  block_i.clear = block_item.clear;
                  incoming_routine.array_block[i].push(block_i);
                });
                i+=1;
              });
              
            },
            (error) => {
              console.log(error);
            }
          )
          this.send_data_routine.routine = incoming_routine// Get the routine of that block
          this.send_data_routine.type_def = "Show_Routine";
          this.send_data_routine.routine.parent_routines = this.current_block.parent_routines;
          console.log(this.send_data_routine.routine)
          this.popUpService.saveRoutineEvent.emit(this.send_data_routine); // Overwrite that block
        }
        return true;
      } else { // It has more than 1 block
        let blocks = 0
        for (const num of this.cellPositions) {
          if(num.center_y + num.height/2 > data.event.pageY){
            if(num.center_y - num.height/2 < data.event.pageY){

              // Add to previous row (not new row)
              
              // Routines can't be added in a row with other blocks
              if(this.current_block.class == "routine"){
                this.setOpenRoutine(true)
                break;
              }

              let break_var = 0;
              
              // Check that you can't add 2 blocks from the same class together 
              // or add other blocks to a row with routine
              for(let i = 0; i < this.current_routine.array_block[index_row].length; i++) {
                if((rearenge && (index_row != position.row || i != position.column)) || !rearenge){ // Dont take into account current block if rearanging
                  if(this.current_routine.array_block[index_row][i].class == this.current_block.class 
                    || this.current_routine.array_block[index_row][i].class == "routine"){
                    if(this.current_block.name == "Talk" && this.current_routine.array_block[index_row][i].name == "Talk"){
                      // Talk can be added
                    } else { // Current block cant be added
                      if(this.current_routine.array_block[index_row][i].class == "routine"){
                        this.setOpenRoutine(true)
                      } else {
                        this.setOpenClass(true);
                      }
                      break_var = 1;
                      break;
                    }
                  }
                }
              }

              if(break_var == 1){
                break;
              }
              
              for (let coord of this.allPositions) { // Calculate where in the row it should be added
                if (coord.center_y < num.center_y + 10 && coord.center_y > num.center_y - 10){
                  if(coord.center_x > data.event.pageX){
                    break;
                  }
                  index_col++;
                }
              }
              this.current_routine.array_block[index_row].splice(index_col, 0, this.current_block); // Add it to previous row
              this.delete_previous(position, rearenge, index_row, index_col); // Remove previous if necessary
              return true;
            } else {
              this.current_routine.array_block.splice(index_row, 0, [this.current_block]); // Add new row 
              this.delete_previous(position, rearenge, index_row, index_col); // Delete the previous one
              return true;
            }
            break;
          }
          if(this.current_routine.array_block.length > index_row){
            blocks += this.current_routine.array_block[index_row].length
          } else {
            blocks += 1
          }
          index_row++;
        }
      }

      // Dropped in new row
      if(data.event.pageY > this.cellPositions[this.cellPositions.length - 1].center_y + this.cellPositions[this.cellPositions.length - 1].height/2){
        this.current_routine.array_block.push([this.current_block]);
        this.delete_previous(position, rearenge);
        if (this.current_block.class == "routine"){
          this.current_block.parent_routines = this.current_routine.parent_routines.concat([this.current_routine.name])
          console.log(this.current_routine); // <------- Checking routine
          let incoming_routine = new Routines();
          // Update the parent routine in subroutine
          this.rs.get_routine(this.current_block.name).subscribe( 
            (response) => {
              incoming_routine.name = this.current_block.name; // 
              console.log(incoming_routine);
              let i = 0;
              response.forEach(element => { // Add blocks to the routine
                incoming_routine.array_block.push([])
                element.forEach(block_item => {
                  let block_i = new Send_block();
                  block_i.class = block_item.class;
                  block_i.name = block_item.name;
                  block_i.level = block_item.level;
                  block_i.talk = block_item.talk;
                  block_i.clear = block_item.clear;
                  incoming_routine.array_block[i].push(block_i);
                });
                i+=1;
              });
              
            },
            (error) => {
              console.log(error);
            }
          )
          this.send_data_routine.routine = incoming_routine// Get the routine of that block
          //this.send_data_routine.routine.name = 
          this.send_data_routine.type_def = "Show_Routine";
          this.send_data_routine.routine.parent_routines = this.current_block.parent_routines;
          this.popUpService.saveRoutineEvent.emit(this.send_data_routine); // Overwrite that block
        }
        return true;
      }
      return false;
    }
  }

  // Delete block when it's moved in rutine
  delete_previous(position:{row:number, column:number}, rearenge?: boolean, index_col?:number, index_row?:number){
    if(rearenge){
      if(index_col != undefined){
        if(position.row >= index_col && this.current_routine.array_block[index_col].length == 1){ // Calculate new position
          position.row += 1
        }
        if (position.column >= index_row && position.row == index_col){
          position.column += 1
        }
      }
      this.current_routine.array_block[position.row].splice(position.column, 1) // Erase position
      if(this.current_routine.array_block[position.row].length == 0){ // If row is now empty erase
        this.current_routine.array_block.splice(position.row, 1);
      }
      // Save the routine when moving block
      this.send_data_routine.routine = this.current_routine;
      this.send_data_routine.type_def = "Show_Routine";
      this.popUpService.saveRoutineEvent.emit(this.send_data_routine);
    } else {
      this.blocks -= 1;
    }
  }

  // Toast alerts

  setOpenClass(isOpen: boolean) {
    this.isToastOpenClass = isOpen;
  }

  setOpenRoutine(isOpen: boolean) {
    this.isToastOpenRoutine = isOpen;
  }

  setOpenName(isOpen: boolean) {
    this.isToastOpenName = isOpen;
  }

  handleBlur(event:Event){ // Save routine when user updates a parameter  
    this.send_data_routine.routine = this.current_routine;
    this.send_data_routine.type_def = "Show_Routine";
    this.popUpService.saveRoutineEvent.emit(this.send_data_routine);
  }
}


