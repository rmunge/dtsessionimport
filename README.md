# dtsessionimport


                                     (1)
    ----------------           MSG_Import_Request            ---------------
   |                |   -------------------------------->   |               |
   |                |                (4)                    |               |
   |                |         MSG_Import_Response           |               |               (2)                                               (3) sync REST call
   |  content.js    | <--------------------------------     |    bg.js ...  |   a) find already downloaded file      ------>  dtclient.js
   |                |                (5)                    |               |   b) trigger download and wait for it
   |                |         MSG_ConfirmResponse*          |               |   
   |                |   --------------------------------->  |               |   * as long as no MSG_ConfirmResponse is received, MSG_Import_Response 
    ----------------                                         ---------------      is resent whenever the page of the content script gets active
   
   
   
